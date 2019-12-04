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

const AsyncLock = require('async-lock');
const BackEnd = require('../backend');
const Agent = require('../agent');
const Logger = require('../logger');
const FakeRequest = require('./fakerequest');
const RuntimeV1 = require('./runtime').RuntimeV1;
const Fuzzer = require('./fuzzer');
const State = require('./state');
const Signature = require('./signature');
const METRICTYPE = require('./metrics').METRICTYPE;

// reveal public interface version implemented by the agent
const INTERFACE = 1;

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
    // $lab:coverage:on$
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

        BackEnd.reveal_runtime(Agent.SESSION_ID(), { interface: INTERFACE })
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

            // $lab:coverage:off$
            if (err && err.message) {
                // @ts-ignore
                Logger.ERROR(`Reveal backend didn't received the mutated request with "${err.message}"`);
            }
            else {
                // @ts-ignore
                Logger.ERROR('Reveal backend didn\'t received the mutated request.');
            }
            // $lab:coverage:on$
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

            // $lab:coverage:off$
            if (err && err.message) {
                // $lab:coverage:on$
                // @ts-ignore
                Logger.ERROR(`Reveal backend didn't received current run statistics with "${err.message}"`);
            }
            else {
                // $lab:coverage:off$
                // @ts-ignore
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
        // @ts-ignore
        Logger.ERROR('Reveal failed to init fuzzer with current run.');
        return;
    }
    const runID = fuzzer.runid;

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

        // $lab:coverage:off$
        if (!STATE.isRunning()) {
            return;
        }
        // $lab:coverage:on$
        fuzzerDone(false);
    });
    // This is very important if we don't want to deadlock the fuzzer
    // @ts-ignore
    fuzzer.once('timeout', () => {

        // $lab:coverage:off$
        if (!STATE.isStopped()) {
            // $lab:coverage:on$
            const timeout = !STATE.isTerminating();
            // $lab:coverage:off$
            if (timeout) {
                // @ts-ignore
                Logger.ERROR('Forced shutdown after timeout');
            }
            else {
                // $lab:coverage:on$
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
    fuzzer.mutateInputRequests((mutatedReqs) => {

        const n = mutatedReqs.length;
        console.log(mutatedReqs);
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
                .custom((req, res) => {

                    fuzzer.initRequest(req, mutatedReq);
                })
                .end((req, res) => {

                    fuzzer.finalizeRequest(req, mutatedReq);

                    if (shouldPushStats(fuzzer)) {
                        sendStats(false);
                    }
                    // $lab:coverage:off$
                    // don't keep persistent data in express
                    // TODO: find a better way...
                    if (req && req.session && req.session.destroy) {
                        req.session.destroy();
                    }
                    // $lab:coverage:on$
                });
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
        // $lab:coverage:off$
        if (err && err.message) {
            // $lab:coverage:on$
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

        // $lab:coverage:off$
        // state can have changed due to async events, so let's check it again.
        if (!STATE.isRunning()) {
            return resolve(true);
        }
        // $lab:coverage:on$
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

                // $lab:coverage:off$
                if (!res) {
                    return Promise.reject(new Error('Reveal failed to stop.'));
                }
                // $lab:coverage:on$
                return Promise.resolve();
            })
    );
};
