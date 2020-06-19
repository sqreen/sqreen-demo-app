/**
 * Copyright (c) 2016 - 2020 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
// @ts-check
'use strict';

/**
 * @typedef {import('./reveal').Environment} Environment
 * @typedef {import('./reveal').Runtime} Runtime
 * @typedef {import('./reveal').SessionID} SessionID
 * @typedef {import('./reveal').Run} Run
 * @typedef {import('./reveal').Options} Options
 */

const Joi = require('joi-browser');
const AsyncLock = require('async-lock');

const Logger = require('../logger');
const BackEnd = require('../backend');
const Agent = require('../agent');
const FakeRequest = require('./fakerequest');
const RuntimeV1 = require('./runtime').RuntimeV1;
const Fuzzer = require('./fuzzer');
const Signals = require('./signals');
const State = require('./state');
const Signature = require('./signature');
const METRICTYPE = require('./metrics').METRICTYPE;
/** @type {string} */
// @ts-ignore
const AGENT_VERSION = require('../../package.json').version;
/** @type {Record<string, string>} */
// @ts-ignore
const DEPENDENCIES = require('../../package.json').dependencies;

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

const runtimeSchema = Joi.object({
    code: Joi.string().min(1),
    version: Joi.number().positive(),
    signatures: Joi.array().items(Joi.object({
        type: Joi.number().positive(),
        value: Joi.string().min(1)
    }).unknown(true))
}).unknown(true);

/**
 * @param {object} rawruntime - A Reveal runtime.
 * @returns {Runtime} - A (validated) Reveal runtime (or throw an error).
 */
const sanitizeRuntime = function (rawruntime) {

    const result = Joi.validate(rawruntime, runtimeSchema);

    // $lab:coverage:off$
    if (result.error) {
        throw result.error;
    }
    // $lab:coverage:on$
    return result.value;
};

/**
 * Validate and (re)load the runtime.
 *
 * @param {Runtime} runtime - Reload command parameters.
 * @returns {number}  Returns the (re)loaded runtime version.
 */
const reloadRuntime = function (runtime) {

    // $lab:coverage:off$
    if (!STATE.isUninitialized() &&
        !STATE.isStopped()) {
        throw new Error('Cannot reload Reveal runtime during a run!');
    }
    // $lab:coverage:on$
    Logger.DEBUG('Checking signature for Reveal runtime');
    if (!Signature.verifyRuntimeSignature(runtime)) {
        throw new Error('Invalid Reveal runtime signature!');
    }
    FUZZER = runtime.code;
    STATE.stopped();
    return runtime.version;
};

/**
 * (Re)load the fuzzer code.
 *
 * @returns {Promise<number>} Return runtime version (or an error on reject).
 */
module.exports.reload = function () {

    return REVEAL_LOCK(() =>

        BackEnd.reveal_runtime(Agent.SESSION_ID())
            .then((rawruntime) => {

                // $lab:coverage:off$
                if (!rawruntime || !rawruntime.status) {
                    // $lab:coverage:on$
                    throw new Error('Reveal backend failed to send a runtime!');
                }
                const runtime = sanitizeRuntime(rawruntime);
                Logger.INFO(`Reloading reveal runtime (version: ${runtime.version})`);
                return reloadRuntime(runtime);
            }));
};

/**
  * Start the fuzzer using a given 'run' (queries to be replayed along with their associated metadata).
  * See `reveal-fuzzer` types for reference.
  *
  * @param {Run} run - A Run object (JSON compatible).
  * @returns {string} Return a run ID (or throw an error).
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

const sessionIDSchema = Joi.string().regex(/^session_[a-fA-F0-9]{32}$/);

/**
 * @param {string} rawsessionid - A Reveal session (unique) id.
 * @returns {SessionID | null} - A (validated) Reveal session (unique) id (or null).
 */
const validateSessionID = function (rawsessionid) {

    const result = Joi.validate(rawsessionid, sessionIDSchema);

    // $lab:coverage:off$
    if (result.error) {
        return null;
    }
    // $lab:coverage:on$
    return result.value;
};

/**
 * Start the fuzzer using a given 'run' (queries to be replayed along with their associated metadata).
 * See `reveal-fuzzer` types for reference.
 *
 * @param {SessionID} rawsessionid - A reveal session (unique) id.
 * @returns {Promise<string>} Return a run ID (or an error on reject).
 */
module.exports.start = function (rawsessionid) {

    return REVEAL_LOCK(() => {

        // $lab:coverage:off$
        if (!SERVER) {
            return Promise.reject(new Error('Application server not registred in Reveal!'));
        }
        // $lab:coverage:on$
        //$lab:coverage:off$
        if (!ready()) {
            return Promise.reject(new Error('Reveal is not ready!'));
            //$lab:coverage:on$
        }
        const sessionid = validateSessionID(rawsessionid);
        // $lab:coverage:off$
        if (sessionid === null) {
            return Promise.reject(new Error('Invalid Reveal session ID!'));
        }
        // $lab:coverage:on$
        return BackEnd.reveal_run(Agent.SESSION_ID(), { session_id: sessionid })
            .then((run) => {

                // $lab:coverage:off$
                if (!run || !run.status) {
                    // $lab:coverage:on$
                    throw new Error('Reveal backend failed to send a run!');
                }
                return startFuzzerSafe(run);
            });
    });
};

const recordStats = (stats, done) => {

    Signals.recordStats(stats)
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
};

/**
 * Start the fuzzer using a given 'run' (queries to be replayed along with their associated metadata).
 * See `reveal-fuzzer` types for reference.
 *
 * @param {object} rawrun - A Run object (JSON compatible).
 * @returns {string} Return a run ID (or throw an error).
 */
const startFuzzer = function (rawrun) {

    // $lab:coverage:off$
    if (!ready()) {
        throw new Error('Reveal is not ready!');
    }
    // $lab:coverage:on$

    // validate inputs
    const runtime = new RuntimeV1(FUZZER);

    const run = Fuzzer.validateRun(runtime, rawrun);
    // $lab:coverage:off$
    if (!run) {
        throw new Error('Reveal received an invalid run.');
    }

    const deps = !!DEPENDENCIES ? Object.keys(DEPENDENCIES) : [];
    // $lab:coverage:on$
    /** @type {Environment} */
    const rawenv = {
        agent: 'nodejs',
        version: AGENT_VERSION,
        dependencies: deps,
        os: process.platform
    };
    const env = Fuzzer.validateEnv(runtime, rawenv);
    // $lab:coverage:off$
    if (!env) {
        throw new Error('Reveal received an invalid environment.');
    }
    // $lab:coverage:on$

    const options = run.options;
    //
    // register a new run
    const fuzzer = new Fuzzer(runtime, env, run);
    if (!fuzzer.isValid()) {
        throw new Error('Reveal failed to init fuzzer with current run!');
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

        Signals.recordMutatedRequest(newreq);
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
                Logger.WARN('Forced Reveal shutdown after timeout');
            }
            else {
                // $lab:coverage:on$
                Logger.WARN('Forced Reveal shutdown');
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
                .end((req, res) => {

                    fuzzer.finalizeRequest(req, res, mutatedReq);
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

        // $lab:coverage:off$
        if (STATE.isRunning()) {
            // $lab:coverage:on$
            STATE.terminating();
        }
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
