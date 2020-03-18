/**
 * Copyright (c) 2016 - 2020 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const METRIC_STORE = new Map();
const Exception = require('../exception');
const SqreenSDK = require('sqreen-sdk');
const SignalUtils = require('../signals/utils');

let toReport = [];

module.exports = class {

    constructor(metric, options, source) {

        const name = metric.name;
        if (METRIC_STORE.has(name)) {
            throw new Error('metric exists');
        }
        this.source = source || 'sq.agent.default';
        this.name = name;
        this.kind = metric.kind.toLowerCase();
        this.currentValue = {};
        this.currentKeys = new Map();
        this.timestamp = new Date();

        const seconds = this.timestamp.getSeconds();
        let offset = metric.period;
        if (offset > 60) {
            offset = offset % 60;
        }
        const delta = seconds % offset;
        this.timestamp.setSeconds(seconds - delta);

        this.period = metric.period * 1000;
        this.periodS = metric.period;

        METRIC_STORE.set(name, this);
    }

    resetCurrent(now) {

        this.timestamp = now;
        this.currentKeys.clear();
        this.currentValue = {};
    }

    getValues() {

        const values = [];
        for (const keyTuple of this.currentKeys) {
            values.push({
                key: keyTuple[1],
                value: this.currentValue[keyTuple[0]]
            });
        }
        return values;
    }

    getSignal(now) {

        if (this.currentKeys.size === 0) {
            return null;
        }
        const values = this.getValues();
        const signal = new SqreenSDK.Metric(`sq.agent.metric.${this.name}`, this.source, this.periodS, this.timestamp, now, values);
        signal.payload_schema = SignalUtils.PAYLOAD_SCHEMA.METRIC;
        signal.payload.kind = this.kind;
        return signal;
    }

    process(date, force) {

        const now = new Date();
        date = date || now;

        if (date - this.timestamp > this.period || force) {
            const result = this.getSignal(now);
            if (result !== null) {
                toReport.push(result);
            }
            this.resetCurrent(now);
            return result;
        }
        return null;
    }

    observe(date, force) {

        return this.process(date, force);
    }

    getReport(date, force) {

        return this.observe(date, force);
    };
};

const METRIC_KINDS = {
    Sum: require('./sum'),
    Average: require('./average'),
    Collect: require('./collect'),
    Binning: require('./binning')
};

module.exports.getMetric = function (metric, options, source) {

    metric = metric || {};

    const name = metric.name;
    if (METRIC_STORE.has(name)) {
        const val = METRIC_STORE.get(name);
        val.period = metric.period * 1000;
        val.source = source || 'sqreen:agent:default';
        return val;
    }
    if (METRIC_KINDS[metric.kind]) {
        return new METRIC_KINDS[metric.kind](metric, options, source);
    }
    return null;

};

module.exports.getMetricByName = function (name) {

    return METRIC_STORE.get(name);
};

module.exports.removeMetricsByPrefix = function (prefix) {

    for (const key of METRIC_STORE.keys()) {
        if (key.startsWith(prefix)) {
            removeMetricByName(key);
        }
    }
};

const removeMetricByName = module.exports.removeMetricByName = function (name) {

    METRIC_STORE.delete(name);
};

module.exports._clearAllMetrics = function () {

    METRIC_STORE.clear();
};

module.exports.addBinningObservation = function (name, val, date) {

    if (METRIC_STORE.has(name)) {
        METRIC_STORE.get(name).add(val, date);
    }
    else {
        const met = require('./default').enablePerfForRule(name);
        met.add(val, date);
    }
};

const addOneObservation = module.exports.addOneObservation = function (obs, date) {

    const name = obs[0];
    if (METRIC_STORE.has(name)) {
        const val = METRIC_STORE.get(name);
        val.add.apply(val, obs.slice(1).concat([date]));
    }
    else if (name.startsWith('sq.')) { // this is a rule performance metric to be lazy created
        const val = require('./default').enablePerfForRule(name);
        val.add.apply(val, obs.slice(1).concat([date]));
    }
    else {
        Exception.report(new Error(`unregistered metric: ${obs[0]}`)).catch(() => Promise.resolve());
    }
};

module.exports.addObservations = function (observationList, date) {

    if (observationList.length === 0) {
        return;
    }

    observationList
        .forEach((obs) => addOneObservation(obs, date));
};

module.exports.getAllReports = function (force) {

    if (require('../command/features').featureHolder.use_signals === false) {
        // drop all
        toReport = [];
        return;
    }

    if (force === true) {
        const date = new Date();
        Array.from(METRIC_STORE.values())
            .forEach((metric) => metric.getReport(date, force));
    }
    for (let i = 0; i < toReport.length; ++i) {
        toReport[i].batch();
    }
    toReport = [];
    return [];
};

module.exports._METRIC_STORE = METRIC_STORE;
