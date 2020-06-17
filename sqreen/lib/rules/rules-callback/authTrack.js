/**
 * Copyright (c) 2016 - 2020 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const MainUtils = require('../../util');
const Feature = require('../../command/features');
const Fuzzer = require('../../fuzzer');
const LOGIN = require('../../enums/metrics').LOGIN;

const pre = function (args, value, rule, selfObj, session) {

    const success = args[0];
    const authObj = args[1];
    const req = session && session.req;
    const ip = req && MainUtils.getXFFOrRemoteAddress(req) || '';
    const metricName = success ? LOGIN.SDK_SUCCESS : LOGIN.SDK_FAIL;

    if (!authObj) {
        return {};
    }
    const objKeys = Object.keys(authObj);
    if (objKeys.length === 0) {
        return {};
    }
    const keys = [];
    for (let i = 0; i < objKeys.length; ++i) {
        const okey = objKeys[i];
        keys.push([okey, authObj[okey]]);
    }

    let key;
    // $lab:coverage:off$
    if (Fuzzer.hasFuzzer() && Fuzzer.isRequestReplayed(req)) {
        const reveal = {
            session_id: Fuzzer.getSessionID(req)
        };
        key = JSON.stringify({ keys, ip, reveal });
        // $lab:coverage:on$
    }
    else {
        key = JSON.stringify({ keys, ip });
    }

    Feature.getMetrics().addObservations([[metricName, key, 1]], new Date());
};

module.exports.getCbs = function () {

    return { pre };
};
