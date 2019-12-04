/**
 * Copyright (c) 2019 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
// @ts-check
'use strict';

/** @typedef {import ('vm').Script} Script
 *
 * @typedef {import('./reveal').FuzzID} FuzzID
 * @typedef {import('./reveal').ReqID} ReqID
 * @typedef {import('./reveal').RunID} RunID
 * @typedef {import('./reveal').Options} Options
 * @typedef {import('./reveal').RuntimeVersion} RuntimeVersion
 * @typedef {import('./reveal').Run} Run
 * @typedef {import('./reveal').Request} Request
 * @typedef {import('./reveal').RunStats} RunStats
 * @typedef {import('./reveal').Trace} Trace
 * @typedef {import('./reveal').StackTrace} StackTrace
 * @typedef {import('./reveal').MetricRecord} MetricRecord
 * @typedef {import('./reveal').FuzzRequestResult} FuzzRequestResult
 * @typedef {import('./reveal').PseudoIteratorResult<Request[]>} RequestsIteratorResult
 */

const VM = require('./vm');

const Runtime = class {
    /**
     * @param {string | Buffer} code - Runtime code.
     */
    constructor(code) {

        this._vm = new VM.VM(code);
        this._version = undefined;
    }

    /**
     * @param {Script} script - A precompiled script.
     * @returns {function}
     */
    _runInContext(script) {

        return this._vm.runInContext(script);
    }

    /**
     * @param {string} name
     * @returns {Script}
     */
    _importAPI(name) {

        // $lab:coverage:off$
        if (this._version !== undefined) {
            name = `${this._version}.${name}`;
        }
        // $lab:coverage:on$
        return VM.VM.importAPI(name);
    }
};

module.exports.RuntimeV1 = class extends Runtime {
    /**
     * @param {string | Buffer} code - Runtime code.
     */
    constructor(code) {

        super(code);
        this._version = 'V1';
        this._bindVM();
    }

    // $lab:coverage:off$
    /**
     * Get current interface version.
     *
     * @returns {number} Current interface version (eq: 1).
     */
    getInterfaceVersion() {
        // @ts-ignore
        return this._runInContext(this._api_getInterfaceVersion)();
    }

    /**
     * Get current runtime version.
     *
     * @returns {RuntimeVersion} Metadata related to the current runtime version.
     */
    getRuntimeVersion() {
        // @ts-ignore
        return this._runInContext(this._api_getRuntimeVersion)();
    }
    // $lab:coverage:on$

    /**
     * Validate an input run.
     *
     * @param {Record<string, any>} rawrun - A raw (potentially invalid) input run.
     *
     * @returns {Run | null}  A (valid) Run object.
     */
    validateRun(rawrun) {
        // @ts-ignore
        return this._runInContext(this._api_validateRun)(rawrun);
    }

    /**
     * Create a new fuzzer instance for a given Run.
     *
     * @param {Run} run - An input run.
     *
     * @returns {FuzzID | null} A fuzzer reference (or null in case of failure).
     */
    initFuzzer(run) {
        // @ts-ignore
        return this._runInContext(this._api_initFuzzer)(run);
    }

    /**
     * Retrieve the current run identifier.
     *
     * @param {FuzzID} id - A fuzzer reference.
     *
     * @returns {RunID} Current run identifier.
     */
    getRunID(id) {
        // @ts-ignore
        return this._runInContext(this._api_getRunID)(id);
    }

    /**
     * Retrieve the current run statistics.
     *
     * @param {FuzzID} id - A fuzzer reference.
     *
     * @returns {RunStats} Current run statistics.
     */
    getRunStats(id) {
        // @ts-ignore
        return this._runInContext(this._api_getRunStats)(id);
    }

    // $lab:coverage:off$
    /**
     * Retrieve fuzzer options (can differ for every run).
     *
     * @param {FuzzID} id - A fuzzer reference.
     *
     * @returns {Options} Current Fuzzer options.
     */
    getOptions(id) {
        // @ts-ignore
        return this._runInContext(this._api_getOptions)(id);
    }
    // $lab:coverage:on$

    /**
     * Prepare a request before replaying it.
     *
     * @param {FuzzID} id - A fuzzer reference.
     * @param {Request} request - The mutated input request.
     *
     * @returns {ReqID | null} A request reference (or null in case of failure)
     */
    initRequest(id, request) {
        // @ts-ignore
        return this._runInContext(this._api_initRequest)(id, request);
    }

    // $lab:coverage:off$
    /**
     * Record traces (that will be used as markers to compute the code coverage).
     *
     * A trace can be any string related to an event that matter in term of coverage
     * (ex: the semantic of an SQL request).
     *
     * Note: This function use a list of inputs as it's *strongly* advised to batch them.
     *
     * @param {FuzzID} id - A fuzzer reference.
     * @param {ReqID} rid - A request reference.
     * @param {Trace[]} traces - A list of trace.
     *
     * @returns {boolean} True if successfully recorded.
     */
    recordTraces(id, rid, traces) {
        // @ts-ignore
        return this._runInContext(this._api_recordTraces)(id, rid, traces);
    }

    /**
     * Record a stack trace (used to compute the code coverage).
     *
     * Note: This function use a list of inputs as it's *strongly* advised to batch them.
     *
     * @param {FuzzID} id - A fuzzer reference.
     * @param {ReqID} rid - A request reference.
     * @param {StackTrace[]} stacktraces - A list of stack trace.
     *
     * @returns {boolean} True if successfully recorded.
     */
    recordStackTraces(id, rid, stacktraces) {
        // @ts-ignore
        return this._runInContext(this._api_recordStackTraces)(id, rid, stacktraces);
    }
    // $lab:coverage:on$

    /**
     * Finalize a request.
     *
     * @param {FuzzID} id - A fuzzer reference.
     * @param {ReqID} rid - A request reference.
     * @param {Request} request - The mutated input request.
     *
     * @returns {FuzzRequestResult | null} The results of the request being replayed, null in case of failure.
     */
    finalizeRequest(id, rid, request) {
        // @ts-ignore
        return this._runInContext(this._api_finalizeRequest)(id, rid, request);
    }

    /**
     * Terminate a request.
     *
     * Warning: the associated request resources will be released, and request reference will be consumed.
     *
     * @param {FuzzID} id - A fuzzer reference.
     * @param {ReqID} rid - A request reference.
     *
     * @returns {boolean} True if successful.
     */
    terminateRequest(id, rid) {
        // @ts-ignore
        return this._runInContext(this._api_terminateRequest)(id, rid);
    }

    /**
     * Generate mutated requests from the corpus.
     *
     * @param {FuzzID} id - A fuzzer reference.
     * @param {number} mutations - Maximum number of mutated requests to generate.
     *                             A negative value will ask the function to return
     *                             the number of mutations for one input request.
     * @returns {RequestsIteratorResult} A list of mutated requests.
     */
    mutateInputRequests(id, mutations) {
        // @ts-ignore
        return this._runInContext(this._api_mutateInputRequests)(id, mutations);
    }

    /**
     * Update the statistics with new metrics.
     *
     * @param {FuzzID} id - A fuzzer reference.
     * @param {MetricRecord[]} records - A list of metric records.
     *
     * @returns {boolean} True if successful.
     *
     * Note: This function use a list of inputs as it's *strongly* advised to batch them.
     */
    updateMetrics(id, records) {
        // @ts-ignore
        return this._runInContext(this._api_updateMetrics)(id, records);
    }

    // $lab:coverage:off$
    /**
     * Update the request statistics with new metrics.
     *
     * @param {FuzzID} id - A fuzzer reference.
     * @param {ReqID} rid - A request reference.
     * @param {MetricRecord[]} records - A list of metric records.
     *
     * @returns {boolean} True if successful.
     *
     * Note: This function use a list of inputs as it's *strongly* advised to batch them.
     */
    updateRequestMetrics(id, rid, records) {
        // @ts-ignore
        return this._runInContext(this._api_updateRequestMetrics)(id, rid, records);
    }

    /**
     * Terminate the fuzzer instance.
     *
     * @param {FuzzID} id - A fuzzer reference.
     *
     * Warning: the associated fuzzer resources will be released, and fuzzer reference will be consumed.
     *
     * @returns {boolean} True if successful.
     */
    terminateFuzzer(id) {
        // @ts-ignore
        return this._runInContext(this._api_terminateFuzzer)(id);
    }
    // $lab:coverage:on$

    _bindVM() {

        const APIS = [
            'validateRun', 'initFuzzer', 'getRunID', 'getRunStats',
            'getInterfaceVersion', 'getRuntimeVersion', 'getOptions',
            'initRequest', 'recordTraces', 'recordStackTraces',
            'finalizeRequest', 'terminateRequest', 'mutateInputRequests',
            'updateMetrics', 'updateRequestMetrics', 'terminateFuzzer'];

        for (const api of APIS) {
            this[`_api_${api}`] = this._importAPI(api);
        }
    }
};
