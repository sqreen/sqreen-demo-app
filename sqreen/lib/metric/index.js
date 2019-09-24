/**
 * Copyright (c) 2016 - 2019 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const METRIC_STORE = new Map();
const Exception = require('../exception');

let toReport = [];

const getName = function (metric) {

    return metric.name;
};

module.exports = class {

    constructor(metric) {

        const name = getName(metric);
        if (METRIC_STORE.has(name)) {
            throw new Error('metric exists');
        }
        this.name = name;
        this.metricName = metric.name;
        this.currentValue = {};
        this.currentObjectValue = {};
        this.currentObjectValueKeys = new Set();
        this.timestamp = new Date();

        const seconds = this.timestamp.getSeconds();
        let offset = metric.period;
        if (offset > 60) {
           offset = offset % 60
        }
        const delta = seconds % offset;
        this.timestamp.setSeconds(seconds - delta);

        this.period = metric.period * 1000;

        METRIC_STORE.set(name, this);
    }

    get values () {

        return toReport.filter((x) => x.name === this.metricName);
    }

    process(date, force) {

        const now = new Date();
        date = date || now;

        if (date - this.timestamp > this.period || force) {
            if (this.build) {
                this.build();
            }
            if (this.isEmpty && this.isEmpty() === true) {
                this.currentValue = {};
                this.timestamp = now;
                return this.currentValue;
            }
            const payload = {
                start: this.timestamp,
                finish: now,
                observation: this.currentValue,
                object_observation: Array.from(this.currentObjectValueKeys)
                    .map((key) => ({ key: JSON.parse(key), value: this.currentObjectValue[key] })),
                name: this.metricName
            };
            if (typeof payload.observation === 'object') {
                if (Object.keys(payload.observation).length > 0 || payload.object_observation.length > 0) {
                    toReport.push(payload);
                }
            }
            else {
                toReport.push(payload)
            }

            this.currentValue = {};
            this.currentObjectValue = {};
            this.currentObjectValueKeys = new Set();
            this.timestamp = now;
        }
        return this.currentValue;
    }

    observe(force) {

        this.process(null, force);
        return this.values;
    }

    get report() {

        // no breaking changes
        return this.getReport(false);
    };

    getReport(force) {

        return this.observe(force);
    };
};

const METRIC_KINDS = {
    Sum: require('./sum'),
    Average: require('./average'),
    Collect: require('./collect'),
    Binning: require('./binning')
};

module.exports.getMetric = function (metric, options) {

    metric = metric || {};

    const name = getName(metric);
    if (METRIC_STORE.has(name)) {
        const val = METRIC_STORE.get(name);
        val.period = metric.period * 1000;
        return val;
    }
    if (METRIC_KINDS[metric.kind]) {
        return new METRIC_KINDS[metric.kind](metric, options);
    }
    return null;

};

module.exports.getName = getName;
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
        met.add(val, date)
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

    if (force === true) {
        Array.from(METRIC_STORE.values())
            .forEach((metric) => metric.getReport(force));
    }
    const result = toReport;
    toReport = [];
    return result;
};

module.exports._METRIC_STORE = METRIC_STORE;
