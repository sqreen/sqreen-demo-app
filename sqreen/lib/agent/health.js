/**
 * Copyright (c) 2016 - 2019 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const HEALTH = require('../enums/metrics').HEALTH;
const Os = require('os');
const V8 = require('v8');
const Metrics = require('../metric');
const Exception = require('../exception');
let MAIN_LOOP = null;

module.exports._hasLoop = function () {

    return !!MAIN_LOOP;
};

const worker = function () {

    try {
        // collect system load and process heap
        const load = Os.loadavg();
        const heapStatistics = V8.getHeapStatistics();
        Metrics.addObservations([
            [HEALTH.SYSTEM_LOAD_1, 'load', load[0]],
            [HEALTH.SYSTEM_LOAD_5, 'load', load[1]],
            [HEALTH.SYSTEM_LOAD_15, 'load', load[2]],
            [HEALTH.PROCESS_TOTAL_HEAP_SIZE, 'value', heapStatistics.total_heap_size],
            [HEALTH.PROCESS_USED_HEAP_SIZE, 'value', heapStatistics.used_heap_size],
            [HEALTH.PROCESS_HEAP_SIZE_LIMIT, 'value', heapStatistics.heap_size_limit]
        ]);
    }
    //$lab:coverage:off$
    catch (e) {
        Exception.report(e).catch(() => {});
    }
    //$lab:coverage:on$
};

const stopLoop = module.exports.stopLoop = function () {

    if (MAIN_LOOP !== null) {
        clearTimeout(MAIN_LOOP);
        MAIN_LOOP = null;
    }
};

module.exports.startLoop = function (interval) {

    stopLoop();
    if (interval > 0) {
        MAIN_LOOP = setInterval(worker, interval);
        MAIN_LOOP.unref();
    }
};
