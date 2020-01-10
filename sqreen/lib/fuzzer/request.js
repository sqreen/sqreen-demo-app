/**
 * Copyright (c) 2016 - 2020 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
// @ts-check
'use strict';

const Trace = require('./trace');

/**
 * @typedef {import('./reveal').Request} Request
 * @typedef {import('./reveal').RequestResult} RequestResult
 * @typedef {import('./reveal').FuzzRequestResult} FuzzRequestResult
 * @typedef {import('./reveal').MetricKey} MetricKey
 * @typedef {import('./reveal').MetricType} MetricType
 * @typedef {import('./fuzzer')} Fuzzer
 */

module.exports = class {
    /**
     * @param {Fuzzer} fuzzer - A Runtime instance.
     * @param {Request} request - A mutated request.
     */
    constructor(fuzzer, request) {

        this._runtime = fuzzer._runtime;
        this._fid = fuzzer._id;
        this._id = this._runtime.initRequest(this._fid, request);
    }

    /**
     * Check if request is a valid instance
     *
     * @returns {boolean} True if request is a valid instance.
     */
    isValid() {

        return this._id !== null;
    }

    /**
     * Finalize the request.
     *
     * @param {Request} request - A mutated request.
     * @param {RequestResult} result - The request result.
     *
     * @returns {FuzzRequestResult}
     */
    finalize(request, result) {

        return this._runtime.finalizeRequest(this._fid, this._id, request, result);
    }

    /**
     * Terminate a request.
     *
     * Warning: the associated request resources will be released, and request reference will be consumed.
     *
     * @returns {boolean}
     */
    terminate(request) {

        const res = this._runtime.terminateRequest(this._fid, this._id);
        this._id = null;
        return res;
    }

    // $lab:coverage:off$
    /**
     * Update / add a request metric
     *
     * @param {MetricKey} key - A metric key (ex: 'requests.fuzzed').
     * @param {any} value - Update metric using this value.
     * @param {MetricType?} [type] - A metric type (optional on existing metrics).
     * @returns {boolean}
     */
    updateRequestMetric(key, value, type) {

        // TODO: add cache
        return this._runtime.updateRequestMetrics(this._fid, this._id, [{ key, value, type }]);
    }

    /**
     * Record a trace.
     *
     * @param {string} trace - A 'trace' (anything).
     * @returns {boolean}
     */
    recordTrace(trace) {

        // TODO: add cache
        return this._runtime.recordTraces(this._fid, this._id, [trace]);
    }

    /**
     * Record a stacktrace as a trace.
     *
     * @returns {boolean}
     */
    recordStackTrace() {

        const frames = Trace.getStackTrace();
        const syms = Trace.getStackSymbols(frames);
        return this._recordStackTrace(syms);
    }

    _recordStackTrace(syms) {

        // TODO: add cache
        return this._runtime.recordStackTraces(this._fid, this._id, [{ syms }]);
    }
    // $lab:coverage:on$
};
