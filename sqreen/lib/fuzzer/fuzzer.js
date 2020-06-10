/**
 * Copyright (c) 2016 - 2020 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
// @ts-check
'use strict';

const Events = require('events');
const Semver = require('semver');

const FuzzerRequest = require('./request');
const FuzzUtils = require('./utils');

const supportGetHeaders = Semver.satisfies(process.version, '>= 7.7.0');

/**
 * @typedef {import('http').IncomingMessage} IncomingMessage
 * @typedef {import('http').ServerResponse} ServerResponse
 * @typedef {import('http').OutgoingHttpHeaders} OutgoingHttpHeaders
 *
 * @typedef {import('./reveal').SessionID} SessionID
 * @typedef {import('./reveal').Environment} Environment
 * @typedef {import('./reveal').RuntimeVersion} RuntimeVersion
 * @typedef {import('./reveal').Run} Run
 * @typedef {import('./reveal').RunID} RunID
 * @typedef {import('./reveal').Options} Options
 * @typedef {import('./reveal').InputRequest} InputRequest
 * @typedef {import('./reveal').Request} Request
 * @typedef {import('./reveal').EndpointKey} EndpointKey
 * @typedef {import('./reveal').MetricKey} MetricKey
 * @typedef {import('./reveal').MetricType} MetricType
 * @typedef {import('./reveal').MetricRecord} MetricRecord
 * @typedef {import('./reveal').Trace} Trace
 * @typedef {import('./reveal').FuzzRequestResult} FuzzRequestResult
 * @typedef {import('./reveal').PseudoIteratorResult<Request[]>} RequestsIteratorResult
 *
 * @typedef {import('./runtime').RuntimeV1} Runtime
 *
 * @typedef {import('./request')} FuzzerRequest
 *
 * @typedef {{
 *     __sqreen_replayed: boolean,
 *     __sqreen_fuzzerrequest: FuzzerRequest
 * } & IncomingMessage} FuzzerIncomingMessage
 *
 * @typedef {{
 *     trace?: Trace,
 *     metric?: MetricRecord
 * }} FuzzerSignal
 */

const Fuzzer = module.exports = class extends Events.EventEmitter {
    /**
     * @param {Runtime} runtime - A Runtime instance.
     * @param {Environment} env - Agent environment.
     * @param {Run} run - A run instance.
     */
    constructor(runtime, env, run) {

        super();

        this._runtime = runtime;
        this._id = this._runtime.initFuzzer(env, run);

        this._mutationsdone = false;
        this._handledreqs = 0;
        this._timeout = null;
    }

    /**
     * @param {Runtime} runtime - A Runtime instance.
     * @param {object} env - Raw agent environment.
     * @returns {Environment | null}
     */
    static validateEnv(runtime, env) {

        return runtime.validateEnv(env);
    }

    /**
     * @param {Runtime} runtime - A Runtime instance.
     * @param {object} run - Raw fuzzer run.
     * @returns {Run | null}
     */
    static validateRun(runtime, run) {

        return runtime.validateRun(run);
    }

    /**
     * Check if fuzzer is a valid instance
     *
     * @returns {boolean} True if fuzzer is a valid instance.
     */
    isValid() {

        return this._id !== null;
    }

    //$lab:coverage:off$
    /**
     * Get current fuzzer options.
     *
     * @returns {Options} Fuzzer options.
     */
    get options() {

        return this._runtime.getOptions(this._id);
    }

    /**
     * Get current session ID.
     *
     * @returns {SessionID} Session ID if successful.
     */
    get sessionid() {

        if (!this._sessionid) {
            this._sessionid = this._runtime.getSessionID(this._id);
        }
        return this._sessionid;
    }
    //$lab:coverage:on$

    /**
     * Get current run ID.
     *
     * @returns {RunID} Run ID if successful.
     */
    get runid() {

        //$lab:coverage:off$
        if (!this._runid) {
            //$lab:coverage:on$
            this._runid = this._runtime.getRunID(this._id);
        }
        return this._runid;
    }

    /**
     * Get run statistics.
     *
     * @returns {object | undefined} Stats if successful, undefined if not.
     */
    get runstats() {

        return this._runtime.getRunStats(this._id);
    }

    //$lab:coverage:off$
    /**
     * Terminate a fuzzer.
     *
     * Warning: the associated fuzzer resources will be released, and request reference will be consumed.
     *
     * @returns {boolean}
     */
    terminate(request) {

        const res = this._runtime.terminateFuzzer(this._id);
        this._id = null;
        return res;
    }
    //$lab:coverage:on$

    /**
     * Prepare a request (real or fake) before replaying it.
     *
     * @param {IncomingMessage} _req - A native HTTP request.
     * @param {Request} mutated - The mutated input.
     * @returns {boolean} True if request is being replayed by us.
     */
    initRequest(_req, mutated) {

        // $lab:coverage:off$
        if (!_req || Fuzzer.isRequestReplayed(_req)) {
            return false;
        }
        // $lab:coverage:on$
        const req = /** @type FuzzerIncomingMessage */ (_req);
        req.__sqreen_replayed = true;
        const fuzzerrequest = new FuzzerRequest(this, mutated);
        // $lab:coverage:off$
        if (!fuzzerrequest.isValid()) {
            return false;
        }
        // $lab:coverage:on$
        req.__sqreen_fuzzerrequest = fuzzerrequest;
        this._handledreqs++;
        return true;
    }

    /**
     * Finalize a request (real or fake) after replaying it.
     *
     * @param {IncomingMessage} req - A native HTTP request.
     * @param {ServerResponse} res - A native HTTP response.
     * @param {Request} mutated - The mutated input.
     * @returns {boolean} True if request is being replayed by us.
     */
    finalizeRequest(req, res, mutated) {

        // $lab:coverage:off$
        if (!Fuzzer.isRequestReplayed(req)) {
            return false;
        }
        // $lab:coverage:on$
        const fuzzerrequest = Fuzzer._getFuzzerRequest(req);
        // $lab:coverage:off$
        if (fuzzerrequest === null) {
            return false;
        }
        const reqres = {
            statuscode: res.statusCode || 200,
            headers: this._extractHeaders(res)
        };
        // $lab:coverage:on$
        const ret = fuzzerrequest.finalize(mutated, reqres);
        fuzzerrequest.terminate();
        // $lab:coverage:off$
        if (!ret) {
            return false;
        }
        if (ret.unique) {
            this._onNewRequest(req, ret);
        }
        if (ret.stats !== undefined) {
            this._onStats(ret.stats);
        }
        this._handledreqs--;
        this._onRequestDone(req);
        this._cleanupRequest(req);
        if (this._mutationsdone && this._handledreqs <= 0) {
            this._onDone();
        }
        return ret.success;
    }

    /**
     * Mutate input requests.
     *
     * @param {number} mutations - Total number of mutations (override options)
     * @returns {RequestsIteratorResult} An array of mutated requests
     */
    _mutateInputRequests(mutations) {

        return this._runtime.mutateInputRequests(this._id, mutations);
    }

    /**
     * @typedef {(mutated: Request[]) => boolean} HandleMutatedRequest
     */
    /**
     * Mutate input requests (in a primitive async way...).
     *
     * @param {HandleMutatedRequest} cbk - A callback handling the mutated request.
     * @param {{ delay?: number, batchlen?: number }} [options] - Some useful options.
     * @returns {Promise}
     */
    mutateInputRequests(cbk, options) {

        // $lab:coverage:off$
        options = options || {};
        // $lab:coverage:on$
        return new Promise((resolve, reject) => {

            this._mutationsdone = false;
            const done = () => {

                this._mutationsdone = true;
                return resolve();
            };

            // $lab:coverage:off$
            const delay = options.delay || 10;
            let batchlen = options.batchlen || 20;
            batchlen = batchlen >= 2 ? batchlen : 2;

            // $lab:coverage:on$
            FuzzUtils.asyncWhile((iter, next) => {

                let result;
                try {
                    result = this._mutateInputRequests(-1);
                }
                catch (e) {
                    return reject(e);
                }
                const mutatedReqs = result.value;
                // $lab:coverage:off$
                if (!Array.isArray(mutatedReqs)) {
                    return reject(new Error('Unknown critical failure in requests generator'));
                }
                const mutatedReqsCnt = mutatedReqs.length;
                if (mutatedReqsCnt <= 0) {
                    // Nothing to do on first iteration => empty corpus...
                    if (iter < 1) {
                        setTimeout(() => this._onDone(), 1000);
                    }
                    return done();
                }
                let failures = 0;
                // $lab:coverage:on$
                FuzzUtils.asyncForEach(mutatedReqs, (chunk, _j, innernext) => {

                    let res = false;
                    try {
                        res = cbk(chunk);
                        // $lab:coverage:off$
                    }
                    catch (e) {
                        failures++;
                        // all requests failed, we can assume this is super bad and abort...
                        if (failures === mutatedReqsCnt) {
                            return reject(e);
                        }
                        // try to continue fuzzing
                        res = true;
                    }
                    // $lab:coverage:on$
                    if (!res) {
                        return done();
                    }
                    // handle next mutated requests
                    if (!innernext()) {
                        if (result.done) {
                            return done();
                        }
                        return next();
                    }
                }, { delay, chunklen: batchlen });
            }, delay);
        });
    };

    /**
     * Update / add a fuzzer metric
     *
     * @param {MetricKey} key - A metric key (ex: 'requests.fuzzed').
     * @param {any} value - Update metric using this value.
     * @param {MetricType?} [type] - A metric type (optional on existing metrics).
     * @returns {boolean}
     */
    updateMetric(key, value, type) {

        // TODO: add cache
        return this.updateEndpointMetric(undefined, key, value, type);
    }

    /**
     * Update / add a fuzzer endpoint metric
     *
     * @param {EndpointKey} endpoint - A path identifying an endpoint.
     * @param {MetricKey} key - A metric key (ex: 'requests.fuzzed').
     * @param {any} value - Update metric using this value.
     * @param {MetricType?} [type] - A metric type (optional on existing metrics).
     * @returns {boolean}
     */
    updateEndpointMetric(endpoint, key, value, type) {

        // $lab:coverage:off$
        // TODO: add cache
        return this._runtime.updateMetrics(this._id, [{ endpoint, key, value, type }]);
        // $lab:coverage:on$
    }

    // $lab:coverage:off$
    /**
     * Record a signal (trace, metric, ...).
     *
     * @param {IncomingMessage} req - A native HTTP request.
     * @param {FuzzerSignal} signal - A signal (trace, metric, ...).
     * @returns {boolean}
     */
    static recordSignal(req, signal) {

        let res = true;
        if (signal.trace) {
            res = this.recordTrace(req, signal.trace) && res;
        }
        if (signal.metric) {
            const metric = signal.metric;
            res = this.updateRequestMetric(req, metric.key, metric.value, metric.type) && res;
        }
        return res;
    }
    /**
     * Record a trace.
     *
     * @param {IncomingMessage} req - A native HTTP request.
     * @param {string} trace - A 'trace' (anything).
     * @returns {boolean}
     */
    static recordTrace(req, trace) {

        const fuzzerrequest = Fuzzer._getFuzzerRequest(req);
        if (fuzzerrequest === null) {
            return false;
        }
        return fuzzerrequest.recordTrace(trace);
    }

    /**
     * Record a stacktrace as a trace.
     *
     * @param {IncomingMessage} req - A native HTTP request.
     * @returns {boolean}
     */
    static recordStackTrace(req) {

        const fuzzerrequest = Fuzzer._getFuzzerRequest(req);
        if (fuzzerrequest === null) {
            return false;
        }
        return fuzzerrequest.recordStackTrace();
    }

    /**
     * Update / add a request metric
     *
     * @param {IncomingMessage} req - A native HTTP request.
     * @param {MetricKey} key - A metric key (ex: 'requests.fuzzed').
     * @param {any} value - Update metric using this value.
     * @param {MetricType?} [type] - A metric type (optional on existing metrics).
     * @returns {boolean}
     */
    static updateRequestMetric(req, key, value, type) {

        const fuzzerrequest = Fuzzer._getFuzzerRequest(req);
        if (fuzzerrequest === null) {
            return false;
        }
        return fuzzerrequest.updateRequestMetric(key, value, type);
    }
    // $lab:coverage:on$

    /**
     * Get request Reveal session ID.
     *
     * @param {IncomingMessage} req - A native HTTP request.
     * @returns {SessionID | undefined} Session ID if successful (or undefined if not).
     */
    static getSessionID(req) {

        const fuzzerrequest = Fuzzer._getFuzzerRequest(req);
        // $lab:coverage:off$
        if (fuzzerrequest === null) {
            return;
        }
        // $lab:coverage:on$
        return fuzzerrequest.sessionid;
    };

    /**
     * Test if a request is being replayed.
     *
     * @param {IncomingMessage} _req - A native HTTP request.
     * @returns {boolean} True if request is being replayed by us.
     */
    static isRequestReplayed(_req) {

        const req = /** @type FuzzerIncomingMessage */ (_req);
        return req && !!req.__sqreen_replayed;
    };

    /**
     * Get a {FuzzerRequest} object associated to a request.
     *
     * @param {IncomingMessage} _req - A native HTTP request.
     *
     * @returns {FuzzerRequest | null}
     */
    static _getFuzzerRequest(_req) {

        const req = /** @type FuzzerIncomingMessage */ (_req);
        // $lab:coverage:off$
        if (!req || !req.__sqreen_fuzzerrequest) {
            return null;
        }
        // $lab:coverage:on$
        return req.__sqreen_fuzzerrequest;
    }

    /**
     * Init a timeout on fuzzer.
     *
     * @param {number} timeout - Delay (in ms) before triggering the timeout event.
     */
    armTimeout(timeout) {
        // Every requests have been mutated and replayed...
        // ...but most of them are still being handled by the server at this point
        this._timeout = setTimeout(this._onTimeout.bind(this), timeout);
    }

    /**
     * Remove the fuzzer timeout event.
     */
    resetTimeout() {

        // $lab:coverage:off$
        if (this._timeout !== null) {
            // $lab:coverage:on$
            clearTimeout(this._timeout);
            this._timeout = null;
        }
    }

    /**
     * Cleanup a request (and related resources) after replaying it.
     *
     * @param {IncomingMessage} _req - A native HTTP request.
     */
    _cleanupRequest(_req) {

        const req = /** @type object */ (_req);
        // $lab:coverage:off$
        // don't keep persistent data in express
        // TODO: find a better way...
        if (req && req.session && req.session.destroy) {
            req.session.destroy();
        }
        // $lab:coverage:on$
    }

    /**
     * Extract HTTP headers from a native HTTP response.
     *
     * @param {ServerResponse} res - A native HTTP response.
     *
     * @returns {Record<string, string>} - HTTP headers.
     */
    _extractHeaders(res) {

        /** @type Record<string, string> */
        const out = {};
        // $lab:coverage:off$
        if (!supportGetHeaders) {
            // we don't really care not supporting this on old node.js applications
            return out;
        }
        // $lab:coverage:on$
        const headers = res.getHeaders();
        Object.keys(headers).forEach((key) => {

            out[key] = headers[key].toString();
        });
        return out;
    }

    _onStats(stats) {

        this.emit('stats', stats);
    }

    _onRequestDone(req) {

        this.emit('request_done', req);
    }

    _onNewRequest(req, res) {

        // $lab:coverage:off$
        if (res.updated !== undefined) {
            // $lab:coverage:on$
            this.emit('request_new', req, res.updated);
        }
    }

    _onDone() {

        this.resetTimeout();
        this.emit('all_requests_done');
        this.removeAllListeners();
    }

    _onTimeout() {

        // $lab:coverage:off$
        if (this._timeout !== null) {
            // $lab:coverage:on$
            this.emit('timeout');
            this.removeAllListeners();
        }
    }

};
