/**
 * Copyright (c) 2016 - 2020 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const Exception = require('../exception');
const EventActions = require('../events/action');
const Event = require('../events');
const Agent = require('../agent');
const DefaultMetrics = require('../metric/default');

let INSTRU_ON = false;

module.exports.switchInstrumentationState = function (state) {

    require('../instrumentation/record').switchInstru(state);
    INSTRU_ON = state;
};

const featureHolder = module.exports.featureHolder = {
    heartbeat_delay: 0,
    batch_size: 100,
    max_staleness: 500 * 1000,
    call_counts_metrics_period: 60,
    whitelisted_metric: true,
    rules_signature: true,
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
    exception_cap_threshold_percentage: 10
};

const updatePerfMonitor = function () {

    if (featureHolder.perf_level === 0) {
        return;
    }
    DefaultMetrics.enablePerfMonitor(featureHolder.perf_base, featureHolder.perf_unit, featureHolder.performance_metrics_period);
};

const updatePerfMonitorPct = function () {

    if (featureHolder.perf_level === 0) {
        return;
    }
    DefaultMetrics.enablePerfMonitorPct(featureHolder.perf_pct_base, featureHolder.perf_pct_unit, featureHolder.performance_metrics_period);
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
    },
    max_staleness: function (value){

        EventActions.enableBatch({ max_staleness: value * 1000 });
    },
    call_counts_metrics_period: function (value) {

        DefaultMetrics.enableCallCount(value);
    },
    rules_signature: function (value) {}, // state holding
    whitelisted_metric: function (value) {}, // state holding
    max_radix_size: function (value) {}, // state holding
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
            DefaultMetrics.enablePerfMonitor(featureHolder.perf_base, featureHolder.perf_unit);
            DefaultMetrics.enablePerfMonitorPct(featureHolder.perf_pct_base, featureHolder.perf_pct_unit);
        }
        else {
            DefaultMetrics.disablePerfMonitor();
        }
    },
    perf_base: updatePerfMonitor,
    perf_unit: updatePerfMonitor,
    perf_pct_base: updatePerfMonitorPct,
    perf_pct_unit: updatePerfMonitorPct,
    monitoring_request_overtime_metric_period(period) {

        DefaultMetrics.enableMonitRequestOvertime(period);
    },
    performance_metrics_period() {

        if (featureHolder.performance_metrics_period <= 0) {
            // disable perf metric all together
            DefaultMetrics.disablePerfMonitor();
            return;
        }

        updatePerfMonitor();
        updatePerfMonitorPct();
    },
    health_metrics_level() {

        const DefaultMetric = require('../metric/default');
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

        const DefaultMetric = require('../metric/default');
        DefaultMetric.enableRequestOvertime(featureHolder.request_overtime_metric_period);
    },
    monitoring_perf_budget(timeInMSeconds) {

        if (!timeInMSeconds && timeInMSeconds !== 0) {
            timeInMSeconds = Infinity;
        }
        require('../instrumentation/budget').setMonitBudget(timeInMSeconds);
    }
};

const readParam = function (param) {

    Object.keys(param).forEach((key) => {

        if (!commands[key]) {
            Exception.report(new Error(`no such feature ${key}`)).catch(() => {});
            return;
        }

        const previous = featureHolder[key];
        featureHolder[key] = param[key];
        commands[key](param[key], previous);
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

module.exports.perfmon = function () {

    return INSTRU_ON && featureHolder.perf_level === 1 && featureHolder.performance_metrics_period > 0;
};

