/**
 * Copyright (c) 2016 - 2020 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const Metrics = require('./index');

const PERF = module.exports.NAME = require('../../lib/enums/metrics').PERF;
const KIND = require('../../lib/enums/metrics').KIND;
const HEALTH = require('../../lib/enums/metrics').HEALTH;

module.exports.enableCallCount = function (period) {

    Metrics.getMetric({
        kind: KIND.SUM,
        name: PERF.SQREEN_CALL_COUNTS,
        period: period || 60
    });
};

module.exports.enableWhitelisted = function () {

    Metrics.getMetric({
        kind: KIND.SUM,
        name: PERF.WHITELISTED,
        period: 60
    });
};

module.exports.enableRequestOvertime = function (period) {

    Metrics.removeMetricByName(PERF.REQUEST_OVERTIME);
    Metrics.getMetric({
        kind: KIND.SUM,
        name: PERF.REQUEST_OVERTIME,
        period: period || 60
    });
};

const enableMonitRequestOvertime = module.exports.enableMonitRequestOvertime = function (period) {

    Metrics.removeMetricByName(PERF.MONIT_REQUEST_OVERTIME);
    Metrics.getMetric({
        kind: KIND.SUM,
        name: PERF.MONIT_REQUEST_OVERTIME,
        period: period || 60
    });
};

module.exports.disablePerfMonitor = function () {

    Metrics.removeMetricByName(PERF.PCT);
    Metrics.removeMetricByName(PERF.REQ);
    Metrics.removeMetricByName(PERF.SQ);
    Metrics.removeMetricsByPrefix(PERF.SQ_PREFIX);
};

module.exports.disableMonitPerfMonitor = function () {

    Metrics.removeMetricsByPrefix(PERF.SQ_MONIT_PREFIX);
};

module.exports.enablePerfMonitorPct = function (base, factor, period) {

    Metrics.removeMetricByName(PERF.PCT);
    Metrics.getMetric({
        kind: KIND.BINNING,
        name: PERF.PCT,
        period
    }, { base, factor });
};

module.exports.enablePerfMonitor = function (base, factor, period) {

    Metrics.removeMetricByName(PERF.REQ);
    Metrics.removeMetricByName(PERF.SQ);
    Metrics.removeMetricsByPrefix(PERF.SQ_PREFIX);

    Metrics.getMetric({
        kind: KIND.BINNING,
        name: PERF.REQ,
        period
    }, { base, factor });

    Metrics.getMetric({
        kind: KIND.BINNING,
        name: PERF.SQ,
        period
    }, { base, factor });
};

module.exports.enablePerfForRule = function (name) {

    const Features = require('../../lib/command/features').read();

    return Metrics.getMetric({
        kind: KIND.BINNING,
        name,
        period: Math.max(Features.performance_metrics_period, 0) || 60
    }, { base: Features.perf_base, factor: Features.perf_unit });
};

module.exports.disableHealth = function () {

    Metrics.removeMetricByName(HEALTH.SYSTEM_LOAD_1);
    Metrics.removeMetricByName(HEALTH.SYSTEM_LOAD_5);
    Metrics.removeMetricByName(HEALTH.SYSTEM_LOAD_15);
    Metrics.removeMetricByName(HEALTH.PROCESS_TOTAL_HEAP_SIZE);
    Metrics.removeMetricByName(HEALTH.PROCESS_USED_HEAP_SIZE);
    Metrics.removeMetricByName(HEALTH.PROCESS_HEAP_SIZE_LIMIT);
};

module.exports.enableHealth = function () {

    // We don't care about this metric period as it is filled from a loop which period is dynamic
    Metrics.getMetric({
        kind: KIND.COLLECT,
        name: HEALTH.SYSTEM_LOAD_1,
        period: 30
    });

    Metrics.getMetric({
        kind: KIND.COLLECT,
        name: HEALTH.SYSTEM_LOAD_5,
        period: 30
    });

    Metrics.getMetric({
        kind: KIND.COLLECT,
        name: HEALTH.SYSTEM_LOAD_15,
        period: 30
    });

    Metrics.getMetric({
        kind: KIND.COLLECT,
        name: HEALTH.PROCESS_TOTAL_HEAP_SIZE,
        period: 30
    });

    Metrics.getMetric({
        kind: KIND.COLLECT,
        name: HEALTH.PROCESS_USED_HEAP_SIZE,
        period: 30
    });

    Metrics.getMetric({
        kind: KIND.COLLECT,
        name: HEALTH.PROCESS_HEAP_SIZE_LIMIT,
        period: 30
    });
};

enableMonitRequestOvertime();

