/**
 * Copyright (c) 2019 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
// @ts-check
'use strict';

const Events = require('./events');
const Vm = require('./vm');
const FuzzStats = require('./stats');

/**
 * @typedef { import('http').IncomingMessage } IncomingMessage
 * @typedef { import('./index').Options } Options
 * @typedef { import('./index').Run } Run
 * @typedef { import('./index').InputRequest } InputRequest
 * @typedef { import('./index').InputRequests } InputRequests
 * @typedef { import('./stats').MetricKey } MetricKey
 * @typedef { import('./stats').MetricType } MetricType
 *
 * @typedef {{ params: { query: {}, form: {} } }} Request - A request object.
 * @typedef { Request[] } Requests
 */

/**
 * Iterate over a (potentially large) array in an async (non-blocking) way.
 *
 * @param {InputRequests} arr - An input request object.
 * @param {(value: any, i: number, next: () => boolean) => void} cbk - A callback handling each item.
 * @param {{ delay?: number, chunklen?: number }} [options] - Some useful options.
 */
const asyncForEach = (arr, cbk, options) => {

    options = options || {};
    const len = arr.length;
    if (len < 1) {
        return;
    }
    const delay = options.delay || 1;
    const chunklen = options.chunklen || 1;
    const loop = (i) => {

        const next = () => {

            i += chunklen;
            if (i < len) {
                setTimeout(loop, delay, i);
                return true;
            }
            return false;
        };
        if (chunklen < 2) {
            cbk(arr[i], i, next);
        }
        else {
            cbk(arr.slice(i, i + chunklen), i, next);
        }
    };
    setImmediate(loop, 0);
};

const Fuzzer = module.exports = class extends Vm.VMBinding {
    /**
     * @param {Vm.VM} vm - A VM instance.
     */
    constructor(vm) {

        const stats = new FuzzStats(vm);
        super(vm, 'Fuzzer', stats.shadow);
        this._fuzzedreqs = 0;
        this._stats = stats;
        this._mutationsdone = false;
        this._handledreqs = 0;
        this._timeout = null;
        // @ts-ignore
        this._initListener();
        // @ts-ignore
        this._stats.on('request_new', this._onNewRequest.bind(this));
        this._bindVM();
    }

    /**
     * @param {Vm.VM} vm - A VM instance.
     * @param {object | undefined} run - Raw fuzzer run.
     * @returns {Run}
     */
    static validateRun(vm, run) {

        return Vm.VM.runInVMContext(vm, this._api_validateRun)(run);
    }

    /**
     * Prepare a request (real or fake) before replaying it.
     *
     * @param {IncomingMessage} req - An input request object.
     * @param {InputRequest} orig - The original input.
     * @param {Request} mutated - The mutated input.
     * @returns {boolean} True if request is being replayed by us.
     */
    prepareRequest(req, orig, mutated) {

        if (!req || Fuzzer.isRequestReplayed(req)) {
            return false;
        }
        // @ts-ignore
        req.__sqreen_replayed = true;
        // @ts-ignore
        req.__sqreen_fuzzinput = [orig, mutated];
        this._stats.prepareRequest(req, mutated);
        this._handledreqs++;
        return true;
    }

    /**
     * Finalize a request (real or fake) after replaying it.
     *
     * @param {IncomingMessage} req - An input request object.
     * @param {InputRequest} orig - The original input.
     * @param {Request} mutated - The mutated input.
     * @returns {boolean} True if request is being replayed by us.
     */
    finalizeRequest(req, orig, mutated) {

        if (!Fuzzer.isRequestReplayed(req)) {
            return false;
        }
        this._stats.finalizeRequest(req, mutated);
        this._handledreqs--;
        this._onRequestDone(req);
        if (this._mutationsdone && this._handledreqs <= 0) {
            this._onDone();
        }
    }

    get options() {

        return this._runInContext(this._getter_options)();
    }

    get stats() {

        return this._runInContext(this._getter_stats)();
    }

    get runstats() {

        return this._runInContext(this._getter_runstats)();
    }

    /**
     * Get current run ID.
     *
     * @returns {string | undefined} RunID if successful, undefined if not.
     */
    get runid() {

        return this._runInContext(this._getter_runid)();
    }

    /**
     * Retrieve the number of requests fuzzed.
     *
     * @returns {number} Fuzzed requests.
     */
    get fuzzed() {

        return this._fuzzedreqs;
    }

    /**
     * Mutate an input request.
     *
     * @param {InputRequest} request - An input request object.
     * @param {number} [mutations] - Total number of mutations (override options)
     * @returns {Requests} An array of mutated requests
     */
    mutateRequest(request, mutations) {

        return this._runInContext(this._api_mutateRequest)(request, mutations);
    }

    /**
     * @typedef {(original: InputRequest, mutated: Requests) => boolean} HandleMutatedRequest
     */
    /**
     * Mutate input requests (in a primitive async way...).
     *
     * @param {InputRequests} requests - An input request object.
     * @param {HandleMutatedRequest} cbk - A callback handling the mutated request.
     * @param {{ delay?: number, batchlen?: number }} [options] - Some useful options.
     * @returns {Promise}
     */
    mutateRequests(requests, cbk, options) {

        options = options || {};
        return Promise.resolve()
            .then(() => this.mutationsPerRequest())
            .then((mutations) =>

                new Promise((resolve) => {

                    this._mutationsdone = false;
                    const done = () => {

                        this._mutationsdone = true;
                        return resolve();
                    };

                    const count = requests.length;
                    if (!count || count !== mutations.length) {
                        return done();
                    }

                    const delay = options.delay || 10;
                    const batchlen = options.batchlen || 20;
                    asyncForEach(requests, (request, i, next) => {

                        const mutatedReqs = this.mutateRequest(request, mutations[i]);
                        if (!mutatedReqs || !mutatedReqs.length) {
                            return done();
                        }
                        asyncForEach(mutatedReqs, (chunk, _j, innernext) => {

                            if (!cbk(request, chunk)) {
                                return done();
                            }
                            // handle next mutated requests
                            if (!innernext()) {
                                // handle next request
                                if (!next()) {
                                    done();
                                }
                            }
                        }, { delay, chunklen: batchlen });
                    }, { delay });
                }));
    };

    /**
     * Compute an array with a balanced number of mutations for each request.
     *
     * @returns {Array} An array of mutations count, one for each request.
     */
    mutationsPerRequest() {

        return this._runInContext(this._api_mutationsPerRequest)();
    };

    /**
     * Register input requests into the fuzzer.
     *
     * @param {Run} run - An input Run (corpus / options).
     * @returns {string | undefined} RunID if successful, undefined if not.
     */
    register(run) {

        return this._runInContext(this._api_register)(run);
    }

    /**
     * Reset fuzzer (unregister current run, resets stats).
     *
     * @returns {boolean} true if successful.
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
     * Test if a request is being replayed.
     *
     * @param {IncomingMessage | undefined} req - An input request object.
     * @returns {boolean} True if request is being replayed by us.
     */
    static isRequestReplayed(req) {

        // @ts-ignore
        return req && !!req.__sqreen_replayed;
    };

    _bindVM() {

        this._api_mutateRequest = this._exportAPI('mutateRequest');
        this._api_mutationsPerRequest = this._exportAPI('mutationsPerRequest');
        this._api_updateMetric = this._exportAPI('updateMetric');
        this._api_updateEndpointMetric = this._exportAPI('updateEndpointMetric');
        this._api_updateRequest = this._exportAPI('updateRequest');
        this._api_register = this._exportAPI('register');
        this._api_reset = this._exportAPI('reset');
        this._getter_options = this._exportGetter('options');
        this._getter_stats = this._exportGetter('stats');
        this._getter_runstats = this._exportGetter('runstats');
        this._getter_runid = this._exportGetter('runid');
    }

    static _bindVMStatic() {

        this._api_validateRun = Vm.VM.exportStaticAPI('Fuzzer', 'validateRun');
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

        if (this._timeout !== null) {
            clearTimeout(this._timeout);
            this._timeout = null;
        }
    }

    /**
     * Update an original input request based on mutated one values.
     *
     * @param {InputRequest} orig - Original input request.
     * @param {Request} mutated - A mutated input request.
     * @param {number | undefined} hash - Assign a hash to the new request.
     * @returns {InputRequest}
     */
    _updateRequest(orig, mutated, hash) {

        return this._runInContext(this._api_updateRequest)(orig, mutated, hash);
    }

    _onRequestDone(req) {

        this._fuzzedreqs++;
        // @ts-ignore
        this.emit('request_done', req);
    }

    _onNewRequest(req, hash) {

        // @ts-ignore
        const [orig, mutated] = req.__sqreen_fuzzinput;
        const updated = this._updateRequest(orig, mutated, hash);
        // @ts-ignore
        this.emit('request_new', req, updated);
    }

    _onDone() {

        this.resetTimeout();
        // @ts-ignore
        this.emit('all_requests_done');
        // @ts-ignore
        this.removeAllListeners();
    }

    _onTimeout() {

        if (this._timeout !== null) {
            // @ts-ignore
            this.emit('timeout');
            // @ts-ignore
            this.removeAllListeners();
        }
    }
};
Fuzzer._bindVMStatic();

Events.makeEventEmitter(Fuzzer);
