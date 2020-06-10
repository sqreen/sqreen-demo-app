/**
 * Copyright (c) 2016 - 2020 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const EventEmitter = require('events').EventEmitter;

const Exception = require('../exception');
const Agent = require('../agent');
const SqreenSDK = require('sqreen-sdk');
const EventActions = require('../../lib_old/events/action');
const Event = require('../events');

const InstruState = require('../instrumentation/state');

const FEATURE_EMITTER = module.exports.FEATURE_EMITTER = new EventEmitter();

module.exports.switchInstrumentationState = function (state) {

    InstruState.enabled = state;
};

const featureHolder = module.exports.featureHolder = {
    heartbeat_delay: 0,
    batch_size: 100,
    max_staleness: 500 * 1000,
    call_counts_metrics_period: 60,
    whitelisted_metric: true,
    rules_signature: true,
    reveal_sampling_ratio: 5,
    perf_level: 1,
    perf_base: 2,
    perf_unit: 0.1,
    perf_pct_base: 1.3,
    perf_pct_unit: 1,
    max_radix_size: 1e4,
    performance_metrics_period: 60,
    health_metrics_level: 0,
    health_period: 60000, // 1 min
    request_overtime_metric_period: 60, // 1 min
    monitoring_perf_budget: 5, //ms
    monitoring_request_overtime_metric_period: 60, // s
    exception_cap_alpha: 0.00106049,
    exception_cap_threshold_percentage: 10,
    use_signals: false
};

module.exports.getMetrics = function () {

    //$lab:coverage:off$
    if (featureHolder.use_signals === true) {
        return require('../metric');
    }
    return require('../../lib_old/metric');
    //$lab:coverage:on$
};

const getDefaultMetric = function () {

    if (featureHolder.use_signals === true) {
        return require('../metric/default');
    }
    return require('../../lib_old/metric/default');
};

const enableAllDefaultMetrics = module.exports.enableAllDefaultMetrics = function () {

    [require('../metric/default'), require('../../lib_old/metric/default')]
        .forEach((met) => {

            met.enablePerfMonitor(featureHolder.perf_base, featureHolder.perf_unit, featureHolder.performance_metrics_period);
            met.enablePerfMonitorPct(featureHolder.perf_pct_base, featureHolder.perf_pct_unit, featureHolder.performance_metrics_period);
            met.enableCallCount(featureHolder.call_counts_metrics_period);
            met.enableRequestOvertime(featureHolder.request_overtime_metric_period);
            met.enableMonitRequestOvertime(featureHolder.monitoring_request_overtime_metric_period);
        });
};
enableAllDefaultMetrics();

const updatePerfMonitor = function () {

    if (featureHolder.perf_level === 0) {
        return;
    }
    getDefaultMetric().enablePerfMonitor(featureHolder.perf_base, featureHolder.perf_unit, featureHolder.performance_metrics_period);
};

const updatePerfMonitorPct = function () {

    if (featureHolder.perf_level === 0) {
        return;
    }
    getDefaultMetric().enablePerfMonitorPct(featureHolder.perf_pct_base, featureHolder.perf_pct_unit, featureHolder.performance_metrics_period);
};

const commands = {
    /*    request_compression: function (value) {

     },*/
    heartbeat_delay: function (value) {

        Agent.heartBeatLoopStarter({ firstInterval: value * 1000 });
    },
    batch_size: function (value) {

        if (value < 1){
            EventActions.disableBatch();
            Event.drain();
        }
        else {
            EventActions.enableBatch({ batch_size: value });
        }
        try { // TODO: seriously?!
            SqreenSDK.Signal.prototype.BATCH.maxSize = value;
        }
        catch (_) {}
    },
    max_staleness: function (value){

        EventActions.enableBatch({ max_staleness: value * 1000 });
        try { // TODO: seriously?!
            SqreenSDK.Signal.prototype.BATCH.maxAgeMS = value * 1000;
        }
        catch (_) {}
    },
    call_counts_metrics_period: function (value) {

        getDefaultMetric().enableCallCount(value);
    },
    reveal_sampling_ratio: function (value) {}, // state holding
    rules_signature: function (value) {}, // state holding
    whitelisted_metric: function (value) {}, // state holding
    max_radix_size: function (value) {}, // state holding
    use_signals: function (value) {}, // state holding
    exception_cap_alpha: function (value, previous) {

        if (value < 0 || value > 1) {
            // Rollback
            featureHolder.exception_cap_alpha = previous;
            Exception.report(new Error(`exception_cap_alpha must be > 0 and <= 1 - received ${value}`))
                .catch(() => {});
        }
    },
    exception_cap_threshold_percentage: function (value, previous) {

        if (value <= 0 || value > 1) {
            // Rollback
            featureHolder.exception_cap_threshold_percentage = previous;
            Exception.report(new Error(`exception_cap_threshold_percentage must be >= 0 and < 100% - received ${value}`))
                .catch(() => {});
        }
    },
    perf_level: function (value) {

        if (value === 1) {
            getDefaultMetric().enablePerfMonitor(featureHolder.perf_base, featureHolder.perf_unit, featureHolder.performance_metrics_period);
            getDefaultMetric().enablePerfMonitorPct(featureHolder.perf_pct_base, featureHolder.perf_pct_unit, featureHolder.performance_metrics_period);
        }
        else {
            getDefaultMetric().disablePerfMonitor();
        }
    },
    perf_base: updatePerfMonitor,
    perf_unit: updatePerfMonitor,
    perf_pct_base: updatePerfMonitorPct,
    perf_pct_unit: updatePerfMonitorPct,
    monitoring_request_overtime_metric_period(period) {

        getDefaultMetric().enableMonitRequestOvertime(period);
    },
    performance_metrics_period() {

        if (featureHolder.performance_metrics_period <= 0) {
            // disable perf metric all together
            getDefaultMetric().disablePerfMonitor();
            return;
        }

        updatePerfMonitor();
        updatePerfMonitorPct();
    },
    health_metrics_level() {

        const DefaultMetric = getDefaultMetric();
        const Health = require('../agent/health');
        if (featureHolder.health_metrics_level <= 0) {
            DefaultMetric.disableHealth();
            Health.stopLoop();
            return;
        }
        if (featureHolder.health_metrics_level === 1) {
            DefaultMetric.enableHealth();
            Health.startLoop(featureHolder.health_period);
        }
    },
    request_overtime_metric_period() {

        getDefaultMetric().enableRequestOvertime(featureHolder.request_overtime_metric_period);
    },
    monitoring_perf_budget(timeInMSeconds) {

        if (!timeInMSeconds && timeInMSeconds !== 0) {
            timeInMSeconds = Infinity;
        }
        require('../instrumentation/budget').setMonitBudget(timeInMSeconds);
    }
};

const readParam = function (param) {

    if (param.use_signals !== undefined) {
        featureHolder.use_signals = param.use_signals;
    }

    Object.keys(param).forEach((key) => {

        if (!commands[key]) {
            Exception.report(new Error(`no such feature ${key}`)).catch(() => {});
            return;
        }

        const previous = featureHolder[key];
        featureHolder[key] = param[key];
        commands[key](param[key], previous);

        FEATURE_EMITTER.emit(key, param[key]);
    });
};

module.exports.change = function (params) {

    const was = Object.assign({}, featureHolder);
    if (Array.isArray(params)) {
        params.map(readParam);
    }
    else {
        readParam(params);
    }
    return { was, now: featureHolder };
};

module.exports.read = function () {

    return featureHolder;
};

/**
 *
 * @return {boolean}
 */
module.exports.perfmon = function () {

    return InstruState.enabled === true && featureHolder.perf_level === 1 && featureHolder.performance_metrics_period > 0;
};
