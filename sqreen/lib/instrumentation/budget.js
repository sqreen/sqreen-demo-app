/**
 * Copyright (c) 2016 - 2020 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const CONST = require('../enums/metrics');
const Util = require('./utils');

const PURPOSES = {
    SECURITY: 'security',
    MONITORING: 'monitoring'
};

const CURRENT_VALUE = {
    [PURPOSES.SECURITY]: Infinity,
    [PURPOSES.MONITORING]: require('../command/features').read().monitoring_perf_budget
};

const CACHES = {
    [PURPOSES.SECURITY]: new WeakMap(),
    [PURPOSES.MONITORING]: new WeakMap()
};

const PREFIXES = {
    [PURPOSES.SECURITY]: CONST.PERF.SQ_PREFIX,
    [PURPOSES.MONITORING]: CONST.PERF.SQ_MONIT_PREFIX
};

const OVERTIME_METRIC = {
    [PURPOSES.SECURITY]: CONST.PERF.REQUEST_OVERTIME,
    [PURPOSES.MONITORING]: CONST.PERF.MONIT_REQUEST_OVERTIME
};

const getMetrics = require('../command/features').getMetrics;
const safeMetricMethod = function (method) {

    const metric = getMetrics();
    //$lab:coverage:off$
    if (!metric || typeof metric[method] !== 'function') {
        //$lab:coverage:on$
        return null;
    }
    return metric[method];
};
const addBinningObservation = function (arg1, arg2, arg3) {

    const method = safeMetricMethod('addBinningObservation');
    //$lab:coverage:off$
    if (method !== null) {
        //$lab:coverage:on$
        return method(arg1, arg2, arg3);
    }
};
const addOneObservation = function (arg1, arg2, arg3) {

    const method = safeMetricMethod('addOneObservation');
    //$lab:coverage:off$
    if (method !== null) {
        //$lab:coverage:on$
        return method(arg1, arg2, arg3);
    }
};

const Budget = class {

    /**
     *
     * @param {number} max in milliseconds
     * @param {boolean} perfMon
     * @param {string} purpose
     */
    constructor(max, perfMon, purpose) {

        // Default value will be Infinity
        this.max = max;
        this.remain = max;
        this.current = [0, 0];
        this.currentCount = [0, 0];
        this._isInfinity = max === Infinity;
        this.perfMon = perfMon;
        this.sum = 0;
        this.state = '';
        this.stateCtr = 0;
        this.isInCount = false;
        this.purpose = purpose || PURPOSES.SECURITY;
        this.PREFIX = PREFIXES[this.purpose];
        this.OVERTIME_METRIC = OVERTIME_METRIC[this.purpose];
        this.offset0 = 0;
    }

    // Always to be called after startcount
    start() {

        if (this.isInCount === false && this.purpose === PURPOSES.SECURITY) {
            return;
        }
        this.current = process.hrtime();
    }

    // always to be called after start and before stoptcount
    stop(ruleName, cb) {

        if (this.isInCount === false && this.purpose === PURPOSES.SECURITY) {
            return;
        }

        const spent = Util.mergeHrtime(process.hrtime(this.current));
        this.stateCtr += spent;

        if (this.perfMon === true) {
            addBinningObservation(`${this.PREFIX}${ruleName}.${cb}`, spent);
        }

        if (this._isInfinity === false && this.max > 0) { // if has budget
            if (this.remain - this.stateCtr <= 0) { // last cb has made us go over budget or is a nobudget and we were over budget
                addOneObservation([this.OVERTIME_METRIC, ruleName, 1]);
            }
        }

        if (this.purpose === PURPOSES.MONITORING) { // otherwise stopCount will handle the impacts
            this.remain = this.remain - this.stateCtr;
            this.sum += this.stateCtr;
        }
    }

    startCount(kind, monitBudget) {

        monitBudget = monitBudget || { sum: 0 };
        this.state = kind || '';
        this.stateCtr = 0;
        this.isInCount = true;

        if (this.perfMon === true || this._isInfinity !== true) {
            this.currentCount = process.hrtime();
            this.offset0 = monitBudget.sum;
        }
    }

    stopCount(monitBudget) {

        monitBudget = monitBudget || { sum: 0 };
        if (this.isInCount === false) {
            return;
        }

        this.isInCount = false;
        if (this.perfMon === true || this._isInfinity !== true) {
            const monitSpent = monitBudget.sum - this.offset0;
            const spent = Util.mergeHrtime(process.hrtime(this.currentCount)) - monitSpent;
            addBinningObservation(`sq.hooks.${this.state}`, spent - this.stateCtr);
            this.remain -= spent;
            this.sum += spent;
        }
        this.state = '';
        this.stateCtr = 0;
    }

    static getBudget(perfmon, req, purpose) {

        req = req || {};
        purpose = purpose || PURPOSES.SECURITY;

        const cached = CACHES[purpose].get(req);
        if (cached !== undefined) {
            return cached;
        }
        let budget = null;
        const current = CURRENT_VALUE[purpose];

        if (current === Infinity && perfmon === false) {
            budget = Budget.INFINITY;
        }
        else {
            budget = new Budget(current, perfmon, purpose);
        }
        CACHES[purpose].set(req, budget);
        return budget;
    }

    static getMonitoringBudget(perfmon, req) {

        return this.getBudget(perfmon, req, PURPOSES.MONITORING);
    }

    static setBudget(value) {

        CURRENT_VALUE[PURPOSES.SECURITY] = value;
    }

    static setMonitBudget(value) {

        CURRENT_VALUE[PURPOSES.MONITORING] = value;
    }
};

Budget.INFINITY = new Budget(Infinity);
Budget.ZERO = new Budget(0);

module.exports = Budget;
module.exports._safeMetricMethod = safeMetricMethod;
module.exports._addBinningObservation = addBinningObservation;
module.exports._addOneObservation = addOneObservation;
