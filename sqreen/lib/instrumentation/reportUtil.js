/**
 * Copyright (c) 2016 - 2019 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const Hoek = require('../../vendor/hoek/lib/index');
const Config = require('../config/index');

const pick = function (headers, toPick) {

    const res = {};
    for (let i = 0; i < toPick.length; ++i) {
        res[toPick[i]] = headers[toPick[i]];
    }
    return res;
};

const headersToPick = [
    'x-forwarded-for',
    'x-client-ip',
    'x-real-ip',
    'x-forwarded',
    'x-cluster-client-ip',
    'forwarded-for',
    'forwarded',
    'via',
    'user-agent',
    'content-type',
    'content-length',
    'host',
    'x-requested-with'
];

const mapRequest = module.exports.mapRequest = function (req, withPayload) {

    req.headers = req.headers || {};
    req.connection = req.connection || {};

    // clonning prevent side effects
    const parameters = { query: Hoek.clone(req.query), json: null };
    if (withPayload === true) {
        parameters.json = Hoek.clone(req.body);
    }

    let port = '';
    if (req.headers.host) {
        const portArr = req.headers.host.split(':');
        if (portArr.length > 1) {
            port = portArr.pop();
        }
    }

    return {
        rid: req.__sqreen_uuid,
        headers: pick(req.headers, headersToPick),
        user_agent: req.headers['user-agent'],
        scheme: 'http', // FIXME: should change based on the server type!
        verb: req.method,
        host: req.headers.host,
        port,
        remote_ip: req.connection.remoteAddress,
        remote_port: req.connection.remotePort,
        path: req.url,
        referer: req.headers.referer,
        parameters,
        endpoint: req.__route
    };
};


const MAX_ROUNDS = 10;
const SAFETY = '<Redacted by Sqreen>';
const safe = function (data, i) {

    const conf = Config.getConfig();

    if (conf === undefined || !conf.strip_sensitive_data) {
        return data;
    }

    const stripKeys = new Set(conf.strip_sensitive_keys);
    const stripValues = conf.strip_sentitive_regex;

    if (i === MAX_ROUNDS) {
        return data;
    }
    Object.keys(data)
        .forEach((key) => {

            if ((stripKeys.has(key)) ||
                (typeof data[key] === 'string' && stripValues.find((re) => data[key].match(re)) !== undefined)) {
                data[key] = SAFETY;
                return;
            }
            if (data[key] !== null && typeof data[key] === 'object') {
                return safe(data[key], i + 1);
            }
        });
    return data;
};

module.exports.mapRequestAndArrayHeaders = function (req, withPayload) {

    const res = safe(mapRequest(req, withPayload), 0);
    const heads = [];
    const keys = Object.keys(res.headers);
    for (let i = 0; i < keys.length; ++i) {
        const key = keys[i];
        if (res.headers[key] !== undefined && res.headers[key] !== null) {
            heads.push([key, res.headers[key]]);
        }
    }
    res.headers = heads;
    return res;
};

const RuleUtils = require('../rules/rules-callback/utils');
module.exports.mapRequestParams = function (req) {

    const claims = RuleUtils.getLookableClaims(req);
    if (claims.__sqreen_lookup && claims.__sqreen_lookup.hapi) {
        return {
            scheme: req.scheme,
            query: claims.__sqreen_lookup.hapi.query,
            body: claims.__sqreen_lookup.hapi.payload
        };
    }
    return {
        scheme: req.scheme,
        body: req.body,
        query: req.query,
        endpoint: req.__route
    };
};
