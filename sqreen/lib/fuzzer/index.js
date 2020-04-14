/**
 * Copyright (c) 2016 - 2020 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
// @ts-check
'use strict';
const Semver = require('semver');

const canLoadReveal = Semver.satisfies(process.version, '>= 6.0.0');

const INTERFACE = {};

INTERFACE.hasFuzzer = function () {

    return canLoadReveal;
};
//$lab:coverage:off$
if (canLoadReveal) {
    //$lab:coverage:on$

    INTERFACE.METRICTYPE = require('./metrics').METRICTYPE;
    const main = require('./main');
    INTERFACE.registerServer = main.registerServer;
    INTERFACE.ready = main.ready;
    INTERFACE.reload = main.reload;
    INTERFACE.start = main.start;
    INTERFACE.stop = main.stop;
    const fuzzer = require('./fuzzer');
    INTERFACE.isRequestReplayed = fuzzer.isRequestReplayed;
    INTERFACE.updateRequestMetric = fuzzer.updateRequestMetric;
    INTERFACE.recordSignal = fuzzer.recordSignal;
    INTERFACE.recordTrace = fuzzer.recordTrace;
    INTERFACE.recordStackTrace = fuzzer.recordStackTrace;
}

module.exports = INTERFACE;
