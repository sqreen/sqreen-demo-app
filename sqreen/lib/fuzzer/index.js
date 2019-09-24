/**
 * Copyright (c) 2019 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
// @ts-check
'use strict';

const UuidV4 = require('uuid/v4');
const BackEnd = require('../backend');
const Agent = require('../agent');
const Logger = require('../logger');
const FakeRequest = require('./request');
const VM = require('./vm');
const Fuzzer = require('./fuzzer');
const State = require('./state');
const Signature = require('./signature');
const METRICTYPE = require('./metrics').METRICTYPE;

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
module.exports.ready = function () {

    return !!SERVER && STATE.isStopped();
};

/**
 * @typedef {{ type: number, value: string }} RuntimeSign
 * @typedef {{ code: string, version: number, flags?: string[], signatures: RuntimeSign[] }} RuntimeInterface
 */
/**
 * (Re)load the fuzzer code.
 *
 * @param {RuntimeInterface} runtime - Reload command parameters.
 * @returns {boolean} True if successful.
 */
module.exports.reload = function (runtime) {

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
 * @typedef {{ engine: { timeout: number } }} Options
 * @typedef {{ params: { query: {}, form: {} } }} InputRequest
 * @typedef {InputRequest[]} InputRequests
 * @typedef {{ default: InputRequest, requests: InputRequests }} Corpus
 * @typedef {{ options: Options, corpus: Corpus }} Run
 */
/**
 * Start the fuzzer using a given 'run' (queries to be replayed along with their associated metadata).
 * See `reveal-fuzzer` types for reference.
 *
 * @param {Run} run - A Run object (JSON compatible).
 * @returns {string | undefined} Return a run UUID (or undefined in case of failure).
 */
module.exports.start = function (run) {

    let ret;
    if (!FUZZER || !STATE.isStopped()) {
        return;
    }
    STATE.running();
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
 * @param {Run} run - A Run object (JSON compatible).
 * @returns {string | undefined} Return a run UUID (or undefined in case of failure).
 */
const startFuzzer = function (run) {

    if (!run || !run.corpus) {
        return;
    }
    const vm = new VM.VM(FUZZER);

    const options = Fuzzer.validateOptions(vm, run.options);
    const requests = Fuzzer.validateRequests(vm, run.corpus.requests);
    if (!options || !requests) {
        return;
    }

    if (requests.length === 0) {
        return;
    }

    const runUUID = UuidV4();

    const fuzzer = new Fuzzer(vm, options, run.corpus.default);

    // @ts-ignore
    fuzzer.on('request_new', (req, hash, newinput) => {

        // @ts-ignore
        Logger.INFO('Reveal found a new interesting mutated request.');

        newinput.runid = runUUID;
        newinput.hash = hash;

        recordMutatedRequest(newinput);
    });

    const sendStats = (done) => {

        const stats = {
            date: Date.now(),
            runid: runUUID,
            stats: fuzzer.stats
        };
        return recordStats(stats, done);
    };

    const fuzzerDone = function (timeout) {

        try {
            fuzzer.updateMetric('fuzzer.stopped', Date.now(), METRICTYPE.LAST);

            // @ts-ignore
            Logger.INFO(`Reveal has successfully executed the current run (${runUUID}).`);

            sendStats(true);
        }
        finally {
            STATE.stopped();
        }
    };

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

    fuzzer.registerRequests(requests);
    fuzzer.updateMetric('fuzzer.started', Date.now(), METRICTYPE.LAST);

    // This is very important if we don't want to deadlock the fuzzer
    fuzzer.armTimeout(options.engine.timeout);

    fuzzer.mutateRequests(requests, (origReq, mutatedReqs) => {

        try {
            const n = mutatedReqs.length;
            for (let i = 0; i < n && STATE.isRunning(); ++i) {
                const mutatedReq = mutatedReqs[i];
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
    // TODO: put those values in fuzzer options
    }, { delay: 100, batchlen: 20 }).then(() => {

        // @ts-ignore
        Logger.INFO('All requests have been replayed! Up to the server to process them now...');
    }).catch( (err) => {

        STATE.stopped();
        if (err && err.message) {
            // @ts-ignore
            Logger.ERROR(`"Failed to replay requests with "${err.message}"`);
        }
    });
    return runUUID;
};

/**
 * Force stop the fuzzer.
 *
 * @returns {Promise<boolean>} True if successful.
 */
module.exports.stop = function () {

    if (!FUZZER || !STATE.isRunning()) {
        // nothing to do
        return Promise.resolve(true);
    }
    return new Promise((resolve, _reject) => {

        if (!STATE.isRunning()) {
            return resolve(true);
        }
        STATE.terminating();
        // @ts-ignore
        STATE.once('stopped', () => resolve(true));
    });
};
