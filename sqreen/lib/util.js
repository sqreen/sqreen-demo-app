/**
 * Copyright (c) 2016 - 2020 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const Ip = require('ip');
const Config = require('./config/index');

/**
 * return a promise resolved after some time
 * @param time
 * @returns {Promise}
 */
module.exports.timeout = function (time) {

    return new Promise((resolve) => {

        setTimeout(() => resolve(), time);
    });
};

/**
 * ensure that a key path exists in an object
 * @param object
 * @param path
 */
module.exports.createPathInObject = function (object, path) {

    let current = object;
    for (let i = 0; i < path.length; ++i ){
        current[path[i]] = current[path[i]] || {};
        current = current[path[i]];
    }
};

// deprecated
const headerClaims = module.exports.headerClaims = ['remote-addr', 'via', 'x-cluster-client-ip', 'x-forwarded', 'x-real-ip', 'client-ip', 'x-forwarded-for'];
module.exports.getClientIpFromRequest = function (req) {

    if (!req) {
        return;
    }
    const headers = req.headers || {};
    const remote = req.connection && req.connection.remoteAddress;
    const foundHeader = headerClaims.find((a) => !!headers[a], '');
    let foundValue;
    if (foundHeader) {
        foundValue = headers[foundHeader].split(',').pop().trim();
    }
    return foundValue || remote;
};

const newHeaderClaims = ['x-forwarded-for', 'x-client-ip', 'x-real-ip', 'x-forwarded', 'x-cluster-client-ip', 'forwarded-for', 'forwarded', 'via'];

const listIPs = function (headers, key) {

    if (typeof headers[key] !== 'string') {
        return [];
    }
    return headers[key].split(',').map((s) => s.trim()).filter(Boolean).filter((x) => Ip.isV4Format(x) || Ip.isV6Format(x));

};
module.exports.getXFFOrRemoteAddress = function (req) {

    // TODO: add a cache here somedays when the request abtractor will be built

    if (!req) {
        return '';
    }
    let bestCandidate;

    if (req.headers) {
        const headers = req.headers;
        for (let i = 0; i < newHeaderClaims.length; ++i) {

            const list = listIPs(headers, newHeaderClaims[i]);
            const candidate = list.find((c) => Ip.isPublic(c));
            if (candidate !== undefined) {
                return candidate;
            }
            if (bestCandidate === undefined) {
                bestCandidate = list.find((x) => !Ip.isLoopback(x));
            }
        }
    }

    //noinspection Eslint
    var remote = req.connection && req.connection.remoteAddress || ''; // eslint-disable-line

    if (!remote || typeof remote !== 'string') {
        return bestCandidate || '';
    }

    //noinspection Eslint
    var endRemote = remote.split(':').pop(); // eslint-disable-line
    if (endRemote && Ip.isV4Format(endRemote) && Ip.isEqual(remote, endRemote)) {
        remote = endRemote;
    }

    if (req.ip && !Ip.isV4Format(remote) && !Ip.isV6Format(remote)) { // express case
        return req.ip;
    }

    if (bestCandidate !== undefined && Ip.isLoopback(remote)) {
        return bestCandidate;
    }

    return remote;
};

module.exports.ensureProperIP = function (candidate) {

    try {
        if (candidate.includes('.') && candidate.includes(':')) {
            const left = candidate.split(':')[0];
            if (Ip.isV4Format(left) === true) {
                return left;
            }
            return ''; // worst case scenario
        }
        return candidate;
    }
    catch (e) {
        require('./exception').report(e).catch(() => {});
        return '';
    }
};

module.exports.Queue = class extends Array {

    constructor(maxLength) {

        super();
        this._maxLength = maxLength || Infinity;
    }

    push(item) {

        if (this.length >= this._maxLength) {
            this.shift();
        }
        super.push(item);
    }

    flush() {

        const len = this.length;
        const out = [];
        for (let i = 0; i < len; ++i) {
            out.push(this.shift());
        }
        return out;
    }
};

/** @typedef {{ in_app: boolean, function: string | null, abs_path: string | null, lineno: number| null }} STLine */
/**
 *
 * @return {[STLine]}
 */
module.exports.getMiniStackTrace = function () { // TODO: might be optimized by removing the closure but might kill v8 optims

    const prepareStackTrace = Error.prepareStackTrace;
    const res = [];
    Error.prepareStackTrace = function (_, a) {

        for (let i = 0; i < a.length; ++i) {
            const callSite = a[i];
            const line = {
                in_app: true,
                function: callSite.getFunctionName(),
                abs_path: callSite.getFileName(),
                lineno: callSite.getLineNumber()
            };
            res.push(line);
        }
        return '';
    };
    (new Error()).stack;
    Error.prepareStackTrace = prepareStackTrace;
    return res;
};

const STACK_LINE_RE = /^at (.*):|^\s+at (\S+) \((.*):(\d+):/g;
const STACKLINE_RE_OLD = /^at (.*):(\d+):/g;
/**
 *
 * @param {string} line
 * @return {null | STLine}
 */
module.exports.parseStackTraceLine = function (line) {

    STACK_LINE_RE.lastIndex = 0;
    STACKLINE_RE_OLD.lastIndex = 0;
    const match = STACK_LINE_RE.exec(line);
    if (match !== null) {
        return {
            in_app: true,
            function: match[1],
            abs_path: match[2],
            lineno: parseInt(match[3])
        };
    }
    const matchOld = STACKLINE_RE_OLD.exec(line.trim());
    if (matchOld === null) {
        return null;
    }
    return {
        in_app: true,
        function: '',
        abs_path: matchOld[1],
        lineno: parseInt(matchOld[2])
    };
};

module.exports.isEmitter = function (emitter) {

    return !!emitter.on && !!emitter.addListener && !!emitter.emit;
};

if (Config.getConfig() && Config.getConfig().ip_header.length > 0) {
    newHeaderClaims.unshift(Config.getConfig().ip_header);
}

