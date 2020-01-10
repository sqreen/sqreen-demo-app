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

    const main = require('./main');
    INTERFACE.registerServer = main.registerServer;
    INTERFACE.reload = main.reload;
    INTERFACE.start = main.start;
    INTERFACE.stop = main.stop;
    INTERFACE.METRICTYPE = require('./metrics').METRICTYPE;
    const fuzzer = require('./fuzzer');
    INTERFACE.isRequestReplayed = fuzzer.isRequestReplayed;
    INTERFACE.updateRequestMetric = fuzzer.updateRequestMetric;
    INTERFACE.recordStackTrace = fuzzer.recordStackTrace;
    INTERFACE.recordMarker = fuzzer.recordMarker;
}

module.exports = INTERFACE;
