/**
 * Copyright (c) 2016 - 2019 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const STATUS = require('http').STATUS_CODES;
const Https = require('https');
const Url = require('url');
const HttpsProxyAgent = require('https-proxy-agent');
const HttpProxyAgent = require('http-proxy-agent');

const Wreck = require('../../vendor/wreck/lib/index').defaults({
    timeout: 60000,
    json: true
});

const Version = require('../../version.json');
const CaList = require('../../ca.crt.json');
const Config = require('../config').getConfig();

const proxy = Config && Config.http_proxy;

const agentOption = { maxSockets: Infinity, ca: CaList };

const setupProxy = function (proxyURL) {

    if (proxyURL) {
        Object.assign(agentOption, Url.parse(proxyURL)); // https://github.com/TooTallNate/node-https-proxy-agent/blob/master/index.js#L27
        Wreck.agents.https = new HttpsProxyAgent(agentOption);
        Wreck.agents.http = new HttpProxyAgent(agentOption);
    }
    else {
        Wreck.agents.https = new Https.Agent(agentOption);
    }
};
setupProxy(proxy);

const writeError = function (code, payload) {

    return {
        statusCode: code,
        code: STATUS[code] || code,
        message: payload
    };
};

const defaultHeaders = {
    accept: 'application/json',
    'content-type': 'application/json',
    'user-agent': 'sqreen-nodejs/' + Version.version
};

const assignHeaders = function (opt) {

    const original = opt.headers || {};
    return Object.assign(original, defaultHeaders);
};

const handleResponse = function (resolve, reject) {

    return function (err, response, payload) {

        if (err) {
            if (err.isBoom) {
                err.output = err.output || {};
                return reject(writeError(err.output.statusCode, err.output.payload));
            }
            return reject(err);
        }
        if (response.statusCode !== 200) {
            return reject(writeError(response.statusCode, payload));
        }

        return resolve(payload);
    };
};

const GET = function (uri, options) {

    options.headers = assignHeaders(options);

    return new Promise((resolve, reject) => {

        Wreck.get(uri, options, handleResponse(resolve, reject));
    });
};

const POST = function (uri, options, pl) {

    options.headers = assignHeaders(options);

    try {
        if (typeof pl === 'object') {
            pl = JSON.stringify(pl);
        }
    }
    catch (err) {
        return Promise.reject(err);
    }

    options.payload = pl;

    return new Promise((resolve, reject) => {

        Wreck.post(uri, options, handleResponse(resolve, reject));
    });
};

module.exports.GET = GET;
module.exports.POST = POST;
module.exports._writeError = writeError;
module.exports._assignHeaders = assignHeaders;
module.exports._handleResponse = handleResponse;
module.exports.setupProxy = setupProxy;
