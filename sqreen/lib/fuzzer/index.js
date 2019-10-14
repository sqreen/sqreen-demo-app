/**
 * Copyright (c) 2019 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
// @ts-check
'use strict';

const AsyncLock = require('async-lock');
const BackEnd = require('../backend');
const Agent = require('../agent');
const Logger = require('../logger');
const FakeRequest = require('./request');
const VM = require('./vm');
const Fuzzer = require('./fuzzer');
const State = require('./state');
const Signature = require('./signature');
const METRICTYPE = require('./metrics').METRICTYPE;

const lock = new AsyncLock();

// enforce reveal commands to be executed sequentially
const lockReveal = (cbk) => lock.acquire('reveal', cbk);

// Send stats every N fuzzed requests
const sendStatsEvery = 250;
// FIXME: support multiple servers?
// Current active nodejs HTTP server
let SERVER;
// Current fuzzer code (set by reload)
let FUZZER;
// Current state of the fuzzer
const STATE = new State();

/**
 * Register a node HTTP server.
 * It will handle fuzzer's fake requests.
 *
 * @param { import('http').Server } server - A node server object.
 * @returns {boolean} True if successful.
 */
module.exports.registerServer = function (server) {

    if (!SERVER) {
        SERVER = server;
        return true;
    }
    return false;
};

/**
 * Check if fuzzer is ready to run.
 *
 * @returns {boolean} true if fuzzer is ready.
 */
const ready = module.exports.ready = function () {

    return !!SERVER && !!FUZZER && STATE.isStopped();
};

/**
 * @typedef {{ type: number, value: string }} RuntimeSign
 * @typedef {{ code: string, version: number, flags?: string[], signatures: RuntimeSign[] }} RuntimeInterface
 */
/**
 * Validate and (re)load the runtime.
 *
 * @param {RuntimeInterface} runtime - Reload command parameters.
 */
const reloadRuntime = function (runtime) {

    if (!runtime || !runtime.code) {
        return false;
    }
    if (!STATE.isUninitialized() &&
        !STATE.isStopped()) {
        return false;
    }
    if (!Signature.verifyRuntimeSignature(runtime)) {
        // @ts-ignore
        Logger.ERROR('Invalid reveal runtime signature!');
        return false;
    }
    FUZZER = runtime.code;
    STATE.stopped();
    return true;
};

/**
 * (Re)load the fuzzer code.
 *
 * @returns {Promise<undefined>}
 */
module.exports.reload = function () {

    return lockReveal(() =>

        BackEnd.reveal_runtime(Agent.SESSION_ID())
            .then((runtime) => {

                if (!runtime.status || !runtime.version) {
                    throw new Error('Reveal backend failed to send a runtime.');
                }
                // @ts-ignore
                Logger.INFO(`Reloading reveal runtime (version: ${runtime.version})`);
                const res = reloadRuntime(runtime);
                if (!res) {
                    throw new Error('Runtime reload failed...');
                }
                return;
            }));
};

/**
 * @typedef {{ engine: { timeout: number, throughput: { batch: number, delay: number } } }} Options
 * @typedef {{ params: { query: {}, form: {} } }} InputRequest
 * @typedef {InputRequest[]} InputRequests
 * @typedef {{ defaults: InputRequest, requests: InputRequests }} Corpus
 * @typedef {{ options: Options, corpus: Corpus }} Run
 */

/**
  * Start the fuzzer using a given 'run' (queries to be replayed along with their associated metadata).
  * See `reveal-fuzzer` types for reference.
  *
  * @param {Run} run - A Run object (JSON compatible).
  * @returns {string | undefined} Return a run UUID (or undefined in case of failure).
  */
const startFuzzerSafe = function (run) {

    let ret;
    try {
        ret = startFuzzer(run);
    }
    finally {
        if (!ret) {
            STATE.stopped();
        }
    }
    return ret;
};

/**
 * Start the fuzzer using a given 'run' (queries to be replayed along with their associated metadata).
 * See `reveal-fuzzer` types for reference.
 *
 * @returns {Promise<string>} Return a run UUID (or undefined in case of failure).
 */
module.exports.start = function () {

    return lockReveal(() => {

        if (!ready()) {
            return Promise.reject(new Error('Reveal is not ready.'));
        }
        return BackEnd.reveal_requests(Agent.SESSION_ID())
            .then((run) => {

                if (!run.status) {
                    throw new Error('Reveal backend failed to send a run.');
                }
                const runid = startFuzzerSafe(run);
                if (!runid) {
                    throw new Error('Reveal failed to start...');
                }
                return runid;
            });
    });
};

const shouldPushStats = (fuzzer) => {

    if (!STATE.isRunning() || fuzzer.fuzzed < 1) {
        return false;
    }
    return (fuzzer.fuzzed - 1) % sendStatsEvery === 0;
};

const recordMutatedRequest = (request) =>

    BackEnd.reveal_post_requests(Agent.SESSION_ID(), request)
        .then((response) => {

            // @ts-ignore
            Logger.INFO('Mutated request successfully sent to reveal backend.');
        })
        .catch((err) => {

            if (err && err.message) {
                // @ts-ignore
                Logger.ERROR(`Reveal backend didn't received the mutated request with "${err.message}"`);
            }
            else {
                // @ts-ignore
                Logger.ERROR('Reveal backend didn\'t received the mutated request.');
            }
        });

const recordStats = (stats, done) =>

    BackEnd.reveal_post_stats(Agent.SESSION_ID(), stats)
        .then((response) => {

            if (!done) {
                // @ts-ignore
                Logger.INFO(`Run ${stats.runid} intermediate statistics successfully sent to reveal backend.`);
            }
            else {
                // @ts-ignore
                Logger.INFO(`Run ${stats.runid} statistics successfully sent to reveal backend.`);
            }
        })
        .catch((err) => {

            if (err && err.message) {
                // @ts-ignore
                Logger.ERROR(`Reveal backend didn't received current run statistics with "${err.message}"`);
            }
            else {
                // @ts-ignore
                Logger.ERROR('Reveal backend didn\'t received current run statistics.');
            }
        });

/**
 * Start the fuzzer using a given 'run' (queries to be replayed along with their associated metadata).
 * See `reveal-fuzzer` types for reference.
 *
 * @param {object} _run - A Run object (JSON compatible).
 * @returns {string | undefined} Return a run UUID (or undefined in case of failure).
 */
const startFuzzer = function (_run) {

    if (!ready()) {
        return;
    }

    // validate inputs
    const vm = new VM.VM(FUZZER);

    const run = Fuzzer.validateRun(vm, _run);
    if (!run) {
        return;
    }

    const options = run.options;

    //
    // register a new run
    const fuzzer = new Fuzzer(vm);

    const runID = fuzzer.register(run);
    if (runID === undefined) {
        // @ts-ignore
        Logger.ERROR('Reveal failed to register current run.');
        return;
    }

    //
    // we are now running
    STATE.running();

    const sendStats = (done) => {

        return recordStats(fuzzer.runstats, done);
    };

    const fuzzerDone = function (timeout) {

        try {
            fuzzer.updateMetric('fuzzer.stopped', Date.now(), METRICTYPE.LAST);

            // @ts-ignore
            Logger.INFO(`Reveal has successfully executed the current run (${runID}).`);

            sendStats(true);
        }
        finally {
            STATE.stopped();
        }
    };

    // setup event handlers
    //
    // @ts-ignore
    fuzzer.on('request_new', (req, newreq) => {

        // @ts-ignore
        Logger.INFO('Reveal found a new interesting mutated request.');

        recordMutatedRequest(newreq);
    });

    // @ts-ignore
    fuzzer.once('all_requests_done', () => {

        if (!STATE.isRunning()) {
            return;
        }
        fuzzerDone(false);
    });
    // This is very important if we don't want to deadlock the fuzzer
    // @ts-ignore
    fuzzer.once('timeout', () => {

        if (!STATE.isStopped()) {
            const timeout = !STATE.isTerminating();
            if (timeout) {
                // @ts-ignore
                Logger.ERROR('Forced shutdown after timeout');
            }
            else {
                // @ts-ignore
                Logger.ERROR('Forced shutdown');
            }
            fuzzerDone(timeout);
        }
    });

    // @ts-ignore
    STATE.once('terminating', () => {

        // force stop by shortening timeout
        fuzzer.resetTimeout();
        fuzzer.armTimeout(100);
    });

    fuzzer.updateMetric('fuzzer.started', Date.now(), METRICTYPE.LAST);

    // This is very important if we don't want to deadlock the fuzzer
    fuzzer.armTimeout(options.engine.timeout);

    //
    // start mutating requests in a (async) loop
    fuzzer.mutateRequests(run.corpus.requests, (origReq, mutatedReqs) => {

        try {
            const n = mutatedReqs.length;
            for (let i = 0; i < n && STATE.isRunning(); ++i) {
                const mutatedReq = mutatedReqs[i];
                if (!mutatedReq.params) {
                    continue;
                }
                FakeRequest(SERVER, mutatedReq)
                    .send(mutatedReq.params.form)
                    .query(mutatedReq.params.query)
                    .custom((req, res) => {

                        fuzzer.prepareRequest(req, origReq, mutatedReq);
                    })
                    .end((req, res) => {

                        fuzzer.finalizeRequest(req, origReq, mutatedReq);

                        if (shouldPushStats(fuzzer)) {
                            sendStats(false);
                        }
                        // don't keep persistent data in express
                        // TODO: find a better way...
                        if (req && req.session && req.session.destroy) {
                            req.session.destroy();
                        }
                    });
            }
        }
        catch (err) {
            if (err) {
                const errmsg = err.message || err.toString();
                // @ts-ignore
                Logger.ERROR(`"Failed while replaying a request with "${errmsg}"`);
            }
            // Try to continue the fuzzing
        }
        return !!STATE.isRunning();
    },
    // requests injection rate
    {
        delay: options.engine.throughput.delay,
        batchlen: options.engine.throughput.batch
    }).then(() => {

        // @ts-ignore
        Logger.INFO('All requests have been replayed! Up to the server to process them now...');
    }).catch( (err) => {

        STATE.stopped();
        if (err && err.message) {
            // @ts-ignore
            Logger.ERROR(`"Failed to replay requests with "${err.message}"`);
        }
    });

    return runID;
};

/**
 * Force stop the fuzzer (async).
 *
 * @returns {Promise<boolean>} True if successful.
 */
const stopAsync = function () {

    if (!FUZZER || !STATE.isRunning()) {
        // nothing to do
        return Promise.resolve(true);
    }
    return new Promise((resolve, _reject) => {

        // state can have changed due to async events, so let's check it again.
        if (!STATE.isRunning()) {
            return resolve(true);
        }
        STATE.terminating();
        // @ts-ignore
        STATE.once('stopped', () => resolve(true));
    });
};

/**
 * Force stop the fuzzer.
 *
 * @returns {Promise<undefined>}
 */
module.exports.stop = function () {

    return lockReveal(() =>

        stopAsync()
            .then((res) => {

                if (!res) {
                    return Promise.reject(new Error('Reveal failed to stop.'));
                }
                return Promise.resolve();
            })
    );
};
