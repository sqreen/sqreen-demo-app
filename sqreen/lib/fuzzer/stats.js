/**
 * Copyright (c) 2019 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
// @ts-check
'use strict';

const Events = require('./events');
const Trace = require('./trace');
const Vm = require('./vm');
const METRICTYPE = require('./metrics').METRICTYPE;

/**
 * @typedef { import('http').IncomingMessage } IncomingMessage
 * @typedef { import('./fuzzer').Request } Request
 *
 * @typedef {string} MetricKey - A metric key (ex: 'requests.fuzzed').
 * @typedef {number} MetricType - A metric type (Sum, Average, Last, Collect, ...).
 * @typedef {Record<string, any>} MetricsJSON
 * @typedef {{success: boolean, unique: boolean, hash: number}} FinalizeRequestResult
 */

class ReqStats extends Vm.VMBinding {

    /**
     * @param {Vm.VM} vm - A VM instance.
     */
    constructor(vm) {

        super(vm, 'ReqStats');
        this._bindVM();
    }

    /**
     * Record a backtrace as a trace.
     *
     * @returns {boolean}
     */
    recordBacktrace() {

        const frames = Trace.getStackTrace();
        const syms = Trace.getStackSymbols(frames);
        return this._recordSymbols(syms);
    }

    /**
     * Record a trace.
     *
     * @param {string} trace - A 'trace' (anything).
     * @returns {boolean}
     */
    recordTrace(trace) {

        return this._runInContext(this._api_recordTrace)(trace);
    }

    /**
     * Update / add a request metric
     *
     * @param {MetricKey} key - A metric key (ex: 'requests.fuzzed').
     * @param {any} value - Update metric using this value.
     * @param {MetricType} [type] - A metric type (optional on existing metrics).
     * @returns {boolean}
     */
    updateMetric(key, value, type) {

        return this._runInContext(this._api_updateMetric)(key, value, type);
    }

    /**
     * Finalize the stats for a query (and freeze them).
     * @returns {boolean}
     */
    finalize() {

        return this._runInContext(this._api_finalize)();
    }

    /**
     * @typedef {number} Digest
     */
    /**
     * Get the hash of traces associated to the request.
     *
     * @returns {Digest}
     */
    get hash() {

        return this._runInContext(this._getter_hash)();
    }

    /**
     * Retrieve current request statistics.
     *
     * @returns {MetricsJSON}
     */
    get stats() {

        return this._runInContext(this._getter_stats)();
    }

    /**
     * Returns traces in raw format.
     *
     * @returns {string[]}
     */
    get traces() {

        return this._runInContext(this._getter_traces)();
    }

    _recordSymbols(syms) {

        return this._runInContext(this._api_recordSymbols)(syms);
    }

    _bindVM() {

        this._api_recordTrace = this._exportAPI('recordTrace');
        this._api_recordSymbols = this._exportAPI('recordSymbols');
        this._api_updateMetric = this._exportAPI('updateMetric');
        this._api_finalize = this._exportAPI('finalize');
        this._getter_hash = this._exportGetter('hash');
        this._getter_stats = this._exportGetter('stats');
        this._getter_traces = this._exportGetter('traces');
    }
}


const FuzzStats = module.exports = class extends Vm.VMBinding {

    constructor(vm) {

        super(vm, 'FuzzStats');
        this._vm = vm;
        // @ts-ignore
        this._initListener();
        this._bindVM();
    }

    /**
     * Prepare a request to gather statistics.
     *
     * @param {IncomingMessage} req - An HTTP request.
     * @param {Request} mutated - The mutated input.
     * @returns {boolean}
     */
    prepareRequest(req, mutated) {

        if (!req) {
            return false;
        }
        const reqstats = new ReqStats(this._vm);
        // @ts-ignore
        req.__sqreen_fuzzstats = reqstats;
        return this._prepareRequest(mutated, reqstats.shadow);
    }

    /**
     * Finalize statistics associated to a request.
     *
     * @param {IncomingMessage} req - An HTTP request.
     * @param {Request} mutated - The mutated input.
     * @returns {boolean}
     */
    finalizeRequest(req, mutated) {

        const reqstats = FuzzStats.getReqStats(req);
        if (reqstats === null) {
            return false;
        }

        const ret = this._finalizeRequest(mutated, reqstats.shadow);
        if (!ret) {
            return false;
        }
        if (ret.unique) {
            // @ts-ignore
            this.emit('request_new', req, ret.hash);
        }
        return ret.success;
    }

    /**
     * Reset fuzzer statistics.
     *
     * @returns {boolean}
     */
    reset() {

        return this._runInContext(this._api_reset)();
    }

    /**
     * Update / add a fuzzer metric
     *
     * @param {MetricKey} key - A metric key (ex: 'requests.fuzzed').
     * @param {any} value - Update metric using this value.
     * @param {MetricType} [type] - A metric type (optional on existing metrics).
     * @returns {boolean}
     */
    updateMetric(key, value, type) {

        return this._runInContext(this._api_updateMetric)(key, value, type);
    }

    /**
     * Update / add a fuzzer endpoint metric
     *
     * @param {string} endpoint - A path identifying an endpoint.
     * @param {MetricKey} key - A metric key (ex: 'requests.fuzzed').
     * @param {any} value - Update metric using this value.
     * @param {MetricType} [type] - A metric type (optional on existing metrics).
     * @returns {boolean}
     */
    updateEndpointMetric(endpoint, key, value, type) {

        return this._runInContext(this._api_updateEndpointMetric)(endpoint, key, value, type);
    }

    /**
     * Register an endpoint in statistics.
     *
     * @param {string} endpoint - A path identifying an endpoint.
     * @returns {boolean}
     */
    registerEndpoint(endpoint) {

        return this._runInContext(this._api_registerEndpoint)(endpoint);
    }

    /**
     * Retrieve current fuzzer statistics.
     *
     * @returns {MetricsJSON}
     */
    get stats() {

        return this._runInContext(this._getter_stats)();
    }

    /**
     * Record a trace.
     *
     * @param {IncomingMessage} req - An HTTP request.
     * @param {string} trace - A 'trace' (anything).
     * @returns {boolean}
     */
    static recordTrace(req, trace) {

        const reqstats = FuzzStats.getReqStats(req);
        if (reqstats === null) {
            return false;
        }

        return reqstats.recordTrace(trace);
    }

    /**
     * Record a backtrace as a trace.
     *
     * @param {IncomingMessage} req - An HTTP request.
     * @returns {boolean}
     */
    static recordBacktrace(req) {

        const reqstats = FuzzStats.getReqStats(req);
        if (reqstats === null) {
            return false;
        }

        return reqstats.recordBacktrace();
    }

    /**
     * Record markers based on evaluated rules
     *
     * @param {IncomingMessage} req - An HTTP request.
     * @param {Array} rules - A list of rules being evaluated.
     * @returns {boolean}
     */
    static recordMarker(req, rules) {

        if (!req || !rules) {
            return false;
        }
        for (const entry of rules) {
            const rule = entry.rule;
            let record = false;
            if (rule.attack_type === 'sql_injection') {
                this.updateRequestMetric(req, 'markers.sqlops', 1, METRICTYPE.SUM);
                record = true;
            }
            else if (rule.attack_type === 'lfi') {
                this.updateRequestMetric(req, 'markers.fileops', 1, METRICTYPE.SUM);
                record = true;
            }
            if (record) {
                this.updateRequestMetric(req, 'markers.rules', rule.name, METRICTYPE.COLLECT);
            }
        }
        return true;
    }

    /**
     * Update / add a request metric
     *
     * @param {IncomingMessage} req - An HTTP request.
     * @param {MetricKey} key - A metric key (ex: 'requests.fuzzed').
     * @param {any} value - Update metric using this value.
     * @param {MetricType} [type] - A metric type (optional on existing metrics).
     * @returns {boolean}
     */
    static updateRequestMetric(req, key, value, type) {

        const reqstats = FuzzStats.getReqStats(req);
        if (reqstats === null) {
            return false;
        }

        return reqstats.updateMetric(key, value, type);
    }

    /**
     * Get a {FuzzStats} object associated to a request.
     *
     * @param {IncomingMessage} req - An HTTP request.
     */
    static getReqStats(req) {
        // @ts-ignore
        if (!req.__sqreen_fuzzstats) {
            return null;
        }
        // @ts-ignore
        return req.__sqreen_fuzzstats;
    }

    /**
     * @param {Request} req - The mutated input.
     * @param {ReqStats} reqstats - Request statistics.
     */
    _prepareRequest(req, reqstats) {

        return this._runInContext(this._api_prepareRequest)(req, reqstats);
    }

    /**
     * @param {Request} req - The mutated input.
     * @param {ReqStats} reqstats - Request statistics.
     *
     * @returns {FinalizeRequestResult} Results of request handling.
     */
    _finalizeRequest(req, reqstats) {

        return this._runInContext(this._api_finalizeRequest)(req, reqstats);
    }

    _bindVM() {

        this._api_reset = this._exportAPI('reset');
        this._api_prepareRequest = this._exportAPI('prepareRequest');
        this._api_finalizeRequest = this._exportAPI('finalizeRequest');
        this._api_updateMetric = this._exportAPI('updateMetric');
        this._api_updateEndpointMetric = this._exportAPI('updateEndpointMetric');
        this._api_registerEndpoint = this._exportAPI('registerEndpoint');
        this._getter_stats = this._exportGetter('stats');
    }
};

Events.makeEventEmitter(FuzzStats);
