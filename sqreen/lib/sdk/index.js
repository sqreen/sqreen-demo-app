/**
 * Copyright (c) 2016 - 2020 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const Hoek = require('../../vendor/hoek/lib/index');
// we manually patch the exported modules
const PatchFunction = require('../instrumentation/functionPatcher').patchFunction;
const Record = require('../instrumentation/record');
const Logger = require('../logger');
// const Fuzzer = require('../fuzzer');
const SDK_TYPE = require('../enums/sdk').TYPE;

const MODULE = {
    name: 'sqreen-sdk'
};

let stacktraceEvents = new Set();
module.exports.updateStackTraces = function (arr) {

    stacktraceEvents = new Set(arr);
};

const MAX_PROPERTIES_KEYS = 16;

const getPatchedMethod = module.exports._getPatchedMethod = function (name, holderName) {

    // TODO: continuity relay based on this?
    const module = {};
    module[name] = function () {};

    PatchFunction(module, name, MODULE, holderName);

    return module[name];
};

const auth_track = getPatchedMethod('auth_track', 'auth');
/**
 * record the result of authentication
 * @param request current HTTP request
 * @param success boolean describing if auth was successful
 * @param record object to record to sqreen
 */
const extAuthTrack = module.exports.auth_track = function (request, success, record) {

    // TODO: find a way to ensure we have the (right) HTTP request here.

    const NS = require('../instrumentation/hooks/ns').getNS();

    let _success = success;
    let _record = record;
    let req = null;
    if (arguments.length === 3) {
        req = arguments[0];
    }
    else {
        _success = request;
        _record = success;
        req = NS.get('req');
    }

    const hasReq = req !== null && req !== undefined;
    if (hasReq) {
        // I have the current request
        const reqRecord = Record.lazyGet(req);
        reqRecord.user = record;
        // This request has been replayed by the agent, we can skip the log
        //$lab:coverage:off$
        /*if (Fuzzer.hasFuzzer() && Fuzzer.isRequestReplayed(req)) {
            //$lab:coverage:on$
            return;
        }*/
    }
    // else { TODO: context loss ... with agent message? }


    if (hasReq) {
        NS.run(() => {

            NS.set('req', req);
            NS.set('res', req.__sqreen_res);
            auth_track(!!_success, _record);
        });
    }
    else {
        auth_track(!!_success, _record);
    }
};

const signup_track = getPatchedMethod('signup_track', 'signup');
/**
 * record the signup of a user
 * @param record object to record to sqreen
 */
module.exports.signup_track = function (record) {

    signup_track(record);
};

/**
 * map a user to an HTTP request in Sqreen
 * @param req
 * @param record
 * @param traits
 * @returns {boolean}
 */
module.exports.identify = function (req, record, traits) {

    if (!req) {
        Logger.WARN('The request passed to Sqreen.identify is not valid.');
        Logger.WARN((new Error('Wrong request object')).stack);
        return false;
    }

    const requestRecord = Record.lazyGet(req);
    requestRecord.identify(record, traits);
    return true;
};
const identify = module.exports.identify;

const knownKeys = ['properties', 'user_identifiers', 'timestamp', 'request', 'stacktrace', 'collect_body'];
const track = function (event, args, req, internal) {

    if (typeof event !== 'string') {
        throw new TypeError('event name must be a string');
    }

    if (!internal && event.startsWith('sq.')) {
        Logger.WARN(`Event names starting with ‘sq.’ are reserved. Event: "${event}" has been ignored.`);
        Logger.WARN((new Error('Wrong event name')).stack);
        return false;
    }

    args = args || { timestamp: new Date() };
    if (args.timestamp === undefined) {
        args.timestamp = new Date();
    }
    if (!(args.timestamp instanceof Date)) {
        throw new TypeError('options.timestamp must be a Date');
    }

    const RR = Record.lazyGet(req);
    if (RR === null) {
        Logger.WARN(`Sqreen could not find current request for event: "${event}".`);
        Logger.WARN('Event will be lost.');
        Logger.WARN('Please add current request to the `track` method as described in Sqreen SDK documentation.');
        Logger.WARN((new Error('Lost request object')).stack);
        return false;
    }

    if (RR.identity && args.user_identifiers && !Hoek.deepEqual(RR.identity, args.user_identifiers)) {
        Logger.WARN('Sqreen.identify Sqreen.track have been called with different user_identifiers values.');
    }

    const argsAdditionalKeys = Object.keys(args).filter((key) => knownKeys.indexOf(key) < 0);
    if (argsAdditionalKeys.length > 0) {
        Logger.WARN(`Sqreen.track has been called with the following unknown values: ${argsAdditionalKeys.join(', ')}.`);
        Logger.WARN('Did you mean to use the \'properties\' claim instead?');
    }

    if (args.properties) {
        let clone = true;
        const keys = Object.keys(args.properties);
        if (keys.length > MAX_PROPERTIES_KEYS) {
            Logger.WARN(`Properties for event ${event} had more than 64 entries. Only first 16 entries will be reported.`);
            const sort = keys.sort();
            const prop = {};
            for (let i = 0; i < MAX_PROPERTIES_KEYS; ++i) {
                prop[sort[i]] = args.properties[sort[i]];
            }
            args.properties = prop;
            clone = false; // no need to clone here
        }
        // clonning to prevent user from adding properties to this object later
        if (clone === true) { // perf... I know...
            args.properties = Hoek.clone(args.properties);
        }
    }

    args.request = undefined;
    if (stacktraceEvents.has(event)) {
        args.stacktrace = (new Error(event)).stack;
    }
    Logger.INFO(`tracking event ${event}`);

    if (args.collect_body === true) {
        RR.reportPayload = true;
    }

    RR.addSDK(SDK_TYPE.TRACK, [event, args]);
    return true;
};

const middleWareTrack = function (event, args) {

    track(event, args, this);
};

const middleWareIdentify = function (record, traits) {

    identify(this, record, traits);
};

const userIsBanned = function (req) {

    const record = Record.lazyGet(req);

    if (record === null) {
        return false;
    }
    const Actions = require('../actions/index');
    return Actions.userIsBanned(record.user, req);
};

/**
 * Middleware to integrate Sqreen SDK in an express application
 * @param req
 * @param res
 * @param next
 * @returns {*}
 */
module.exports.middleware = function (req, res, next) {

    req.sqreen = {
        track: middleWareTrack.bind(req),
        identify: middleWareIdentify.bind(req),
        userIsBanned: userIsBanned.bind(null, req),
        signup_track,
        auth_track: extAuthTrack.bind(null, req)
    };
    return next();
};

/**
 * Track an event into Sqreen SDK
 * @param event
 * @param args
 * @returns {boolean}
 */
module.exports.track = function (event, args) {

    const NS = require('../instrumentation/hooks/util').getNS();
    const req = args && args.request || NS.get('req');
    return track(event, args, req, false);
};

module.exports._track = function (event, args, req) {

    return track(event, args, req, true);
};

module.exports.userIsBanned = userIsBanned;
