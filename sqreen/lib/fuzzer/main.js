/**
 * Copyright (c) 2019 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
// @ts-check
'use strict';

/**
 * @typedef {import('./reveal').Runtime} Runtime
 * @typedef {import('./reveal').Run} Run
 * @typedef {import('./reveal').Options} Options
 */

const Logger = /** @type {import('./logger').SqreenLogger} */ (require('../logger'));

const AsyncLock = require('async-lock');
const BackEnd = require('../backend');
const Agent = require('../agent');
const FakeRequest = require('./fakerequest');
const RuntimeV1 = require('./runtime').RuntimeV1;
const Fuzzer = require('./fuzzer');
const State = require('./state');
const Signature = require('./signature');
const METRICTYPE = require('./metrics').METRICTYPE;

// reveal public interface version implemented by the agent
const INTERFACE = 1;

const ASYNC_LOCK = new AsyncLock();

// enforce reveal commands to be executed sequentially
const REVEAL_LOCK = (cbk) => ASYNC_LOCK.acquire('reveal', cbk);

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

    // $lab:coverage:off$
    if (!SERVER) {
        // $lab:coverage:on$
        SERVER = server;
        return true;
    }
    // $lab:coverage:off$
    return false;
    // $lab:coverage:on$
};

/**
 * Check if fuzzer is ready to run.
 *
 * @returns {boolean} true if fuzzer is ready.
 */
const ready = module.exports.ready = function () {

    // $lab:coverage:off$
    return !!SERVER && !!FUZZER && STATE.isStopped();
    // $lab:coverage:on$
};

/**
 * Validate and (re)load the runtime.
 *
 * @param {Runtime} runtime - Reload command parameters.
 */
const reloadRuntime = function (runtime) {

    // $lab:coverage:off$
    if (!runtime || !runtime.code) {
        return false;
    }
    if (!STATE.isUninitialized() &&
        !STATE.isStopped()) {
        return false;
    }
    Logger.DEBUG('Checking signature for reveal runtime');
    // $lab:coverage:on$
    if (!Signature.verifyRuntimeSignature(runtime)) {
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

    return REVEAL_LOCK(() =>

        BackEnd.reveal_runtime(Agent.SESSION_ID(), { interface: INTERFACE })
            .then((runtime) => {

                if (!runtime.status || !runtime.version) {
                    throw new Error('Reveal backend failed to send a runtime.');
                }
                Logger.INFO(`Reloading reveal runtime (version: ${runtime.version})`);
                const res = reloadRuntime(runtime);
                if (!res) {
                    throw new Error('Runtime reload failed...');
                }
                return;
            }));
};

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

    return REVEAL_LOCK(() => {

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

const recordMutatedRequest = (request) =>

    BackEnd.reveal_post_requests(Agent.SESSION_ID(), request)
        .then((response) => {

            Logger.INFO('Mutated request successfully sent to reveal backend.');
        })
        .catch((err) => {

            // $lab:coverage:off$
            if (err && err.message) {
                Logger.ERROR(`Reveal backend didn't received the mutated request with "${err.message}"`);
            }
            else {
                Logger.ERROR('Reveal backend didn\'t received the mutated request.');
            }
            // $lab:coverage:on$
        });

const recordStats = (stats, done) =>

    BackEnd.reveal_post_stats(Agent.SESSION_ID(), stats)
        .then((response) => {

            if (!done) {
                Logger.INFO(`Run ${stats.runid} intermediate statistics successfully sent to reveal backend.`);
            }
            else {
                Logger.INFO(`Run ${stats.runid} statistics successfully sent to reveal backend.`);
            }
        })
        .catch((err) => {

            // $lab:coverage:off$
            if (err && err.message) {
                // $lab:coverage:on$
                Logger.ERROR(`Reveal backend didn't received current run statistics with "${err.message}"`);
            }
            else {
                // $lab:coverage:off$
                Logger.ERROR('Reveal backend didn\'t received current run statistics.');
                // $lab:coverage:on$
            }
        });

/**
 * Start the fuzzer using a given 'run' (queries to be replayed along with their associated metadata).
 * See `reveal-fuzzer` types for reference.
 *
 * @param {object} rawrun - A Run object (JSON compatible).
 * @returns {string | undefined} Return a run UUID (or undefined in case of failure).
 */
const startFuzzer = function (rawrun) {

    // $lab:coverage:off$
    if (!ready()) {
        return;
    }
    // $lab:coverage:on$

    // validate inputs
    const runtime = new RuntimeV1(FUZZER);

    const run = Fuzzer.validateRun(runtime, rawrun);
    // $lab:coverage:off$
    if (!run) {
        return;
    }
    // $lab:coverage:on$
    const options = run.options;

    //
    // register a new run
    const fuzzer = new Fuzzer(runtime, run);
    if (!fuzzer.isValid()) {
        Logger.ERROR('Reveal failed to init fuzzer with current run.');
        return;
    }
    const runID = fuzzer.runid;

    //
    // we are now running
    STATE.running();

    const fuzzerDone = function (timeout) {

        try {
            fuzzer.updateMetric('fuzzer.stopped', Date.now(), METRICTYPE.LAST);

            Logger.INFO(`Reveal has successfully executed the current run (${runID}).`);

            recordStats(fuzzer.runstats, true);
        }
        finally {
            STATE.stopped();
        }
    };

    // setup event handlers
    //
    fuzzer.on('stats', (stats) => {

        // $lab:coverage:off$
        if (!STATE.isRunning()) {
            return;
        }
        // $lab:coverage:on$
        recordStats(stats, false);
    });

    fuzzer.on('request_new', (req, newreq) => {

        Logger.INFO('Reveal found a new interesting mutated request.');

        recordMutatedRequest(newreq);
    });

    fuzzer.once('all_requests_done', () => {

        // $lab:coverage:off$
        if (!STATE.isRunning()) {
            return;
        }
        // $lab:coverage:on$
        fuzzerDone(false);
    });
    // This is very important if we don't want to deadlock the fuzzer
    fuzzer.once('timeout', () => {

        // $lab:coverage:off$
        if (!STATE.isStopped()) {
            // $lab:coverage:on$
            const timeout = !STATE.isTerminating();
            // $lab:coverage:off$
            if (timeout) {
                Logger.ERROR('Forced shutdown after timeout');
            }
            else {
                // $lab:coverage:on$
                Logger.ERROR('Forced shutdown');
            }
            fuzzerDone(timeout);
        }
    });

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
    fuzzer.mutateInputRequests((mutatedReqs) => {

        const n = mutatedReqs.length;
        for (let i = 0; i < n && STATE.isRunning(); ++i) {
            const mutatedReq = mutatedReqs[i];
            // $lab:coverage:off$
            if (!mutatedReq.params) {
                continue;
            }
            // $lab:coverage:on$
            FakeRequest(SERVER, mutatedReq)
                .send(mutatedReq.params.form)
                .query(mutatedReq.params.query)
                .custom((req, _res) => {

                    fuzzer.initRequest(req, mutatedReq);
                })
                .end((req, _res) => {

                    fuzzer.finalizeRequest(req, mutatedReq);
                });
        }
        return !!STATE.isRunning();
    },
    // requests injection rate
    {
        delay: options.engine.throughput.delay,
        batchlen: options.engine.throughput.batch
    }).then(() => {

        Logger.INFO('All requests have been replayed! Up to the server to process them now...');
    }).catch( (err) => {

        STATE.stopped();
        // $lab:coverage:off$
        if (err && err.message) {
            // $lab:coverage:on$
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

        // $lab:coverage:off$
        // state can have changed due to async events, so let's check it again.
        if (!STATE.isRunning()) {
            return resolve(true);
        }
        // $lab:coverage:on$
        STATE.terminating();
        STATE.once('stopped', () => resolve(true));
    });
};

/**
 * Force stop the fuzzer.
 *
 * @returns {Promise<undefined>}
 */
module.exports.stop = function () {

    return REVEAL_LOCK(() =>

        stopAsync()
            .then((res) => {

                // $lab:coverage:off$
                if (!res) {
                    return Promise.reject(new Error('Reveal failed to stop.'));
                }
                // $lab:coverage:on$
                return Promise.resolve();
            })
    );
};
