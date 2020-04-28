/**
 * Copyright (c) 2016 - 2020 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const SqreenSDK = require('sqreen-sdk');
const CB_STATUS = require('../enums/cbReturn').STATUS;
const CONST_CB = require('../enums/cbTypes');
const Director = require('./sqreenDirector');
const CLS = require('./hooks/ns');
const Logger = require('../logger');
const RuleUtil = require('../rules/rules-callback/utils');
const Attack = require('../constructors/attack');
const ReportUtil = require('./reportUtil');
const Config = require('../config').getConfig() || {};
const Exception = require('../exception');
const Utils = require('../util');
const InstrumentationUtils = require('./utils');
const Feature = require('../command/features');
const PreConditions = require('./preConditions');
const Fuzzer = require('../fuzzer');

const getMetrics = function () {

    if (Feature.featureHolder.use_signals === true) {
        return require('../metric');
    }
    return require('../../lib_old/metric');
};

const findRecord = function (req) {

    return require('./record').STORE.get(req) || require('../../lib_old/instrumentation/record').STORE.get(req);
};

const Budget = require('./budget');

const HTTP_CODE = 'http_code';

const isPromise = function (item) {

    return typeof item === 'object' && item !== null && typeof item.then === 'function' && typeof item.catch === 'function';
};

const HeaderClaims = Utils.headerClaims;
const getHeaders = function (req) {

    // FIXME: should collect IP related claims
    if (!req.rawHeaders) {
        return [];
    }

    const result = [];
    const raw = req.rawHeaders;
    for (let i = 0; i < raw.length; ++i) {
        if (HeaderClaims.indexOf(raw[i].toLowerCase()) > -1) {
            result.push([raw[i], raw[i + 1]]);
        }
    }
    return result;
};

const countCB = function () {

    return !!Feature.read().call_counts_metrics_period;
};

const getRequest = function (cbResult) {

    const session = cbResult.originalSession || cbResult.session || {};

    return session.req;
};

/**
 *
 * @param cbResult
 * @param {Error} err
 * @param {RecordTrace} record // TODO: I must be a real record someday
 */
const report = function (cbResult, err, record) {

    // TODO: put in setImmediate ?
    if (!cbResult) {
        return;
    }

    cbResult.rule = cbResult.rule || {};

    const req = getRequest(cbResult);
    //$lab:coverage:off$
    if (Fuzzer.hasFuzzer() && Fuzzer.isRequestReplayed(req)) {
        //$lab:coverage:on$
        Fuzzer.updateRequestMetric(req, 'exceptions.attacks', 1, Fuzzer.METRICTYPE.SUM);
    }
    if (record !== null) {
        const rule = cbResult.rule;

        if (record.isLegacyRecord === true) {
            const ruleName = rule.name;
            record.attack({
                rule_name: ruleName,
                test: rule.test,
                block: rule.block,
                infos: cbResult.record,
                time: new Date(),
                backtrace: (new Error(ruleName)).stack.split('\n') // TODO: use 'prepareStackTrace' ?
            }, cbResult.rule.rulesPack);
            return;
        }

        record.attack(rule.name, rule.attack_type, rule.test, rule.block, rule.beta, cbResult.record, new Date(), Utils.getMiniStackTrace(), rule.rulesPack);
        return;
    }

    const atk = {
        rule_name: cbResult.rule.name,
        rulespack_id: cbResult.rule.rulesPack,
        attack_type: cbResult.rule.attack_type,
        infos: cbResult.record,
        params: req && ReportUtil.mapRequestParams(req),
        request: req && ReportUtil.mapRequest(req),

        block: cbResult.rule.block,
        test: cbResult.rule.test,
        beta: cbResult.rule.beta,
        learning: cbResult.rule.learning,

        headers: req && getHeaders(req)
    };

    atk.client_ip = Utils.getXFFOrRemoteAddress(req);

    atk.request = atk.request || {};
    atk.request.addr = atk.client_ip;

    (new Attack(atk, err)).report();
};

const getRecord = function (cbResult) {

    const req = getRequest(cbResult);
    let record;
    if (req !== undefined && req !== null && req.__sqreen_uuid !== undefined && (record = findRecord(req)) !== undefined) {
        return record;
    }
    return null;
};

const observe = function (cbResult, date, record) {

    if (record !== null) {
        record.observe(cbResult.observations, date);
        return;
    }
    const observations = cbResult.observations;
    getMetrics().addObservations(observations, date);
};

const writeDataPoints = function (cbResult, rule, date, record) {

    if (record !== null && record.isLegacyRecord === true || Feature.featureHolder.use_signals === false) {

        const DataPoint = require('../data_point/index').DataPoint;
        const dataPointList = cbResult.data_points.map((item) => new DataPoint(DataPoint.KIND.RULE, rule.rulesPack, rule.name, item, date));
        //$lab:coverage:off$
        if (record !== null) {
            //$lab:coverage:on$
            record.pushDataPoints(dataPointList);
            return null;
        }
        //$lab:coverage:off$
        DataPoint.reportList(dataPointList);
        return;
        //$lab:coverage:on$
    }

    const RULE = require('../data_point/index').DataPoint.KIND.RULE;
    if (record !== null) {
        for (let i = 0; i < cbResult.data_points.length; ++i) {
            record.dataPoint(RULE, `${rule.rulesPack}:${rule.name}`, cbResult.data_points[i], date);
        }
        return;
    }

    const DataPoint = require('../data_point/index').DataPoint; // TODO: all these fallbacks are to be simplified as points directly
    const dataPointList = cbResult.data_points.map((item) => new DataPoint(DataPoint.KIND.RULE, rule.rulesPack, rule.name, item, date));
    DataPoint.reportList(dataPointList);
};

const writeSignals = function (result, rule, date, record) {

    record.makeReport();
    for (let i = 0; i < result.signals.length; ++i) {
        const signal = result.signals[i];
        const point = record.addPoint(signal.name, `sqreen:rule:${rule.rulesPack}:${rule.name}`, signal.payload, date);
        point.trigger = result.trigger;
        point.payload_schema = result.payload_schema;
    }

};


const performRecordAndObservation = function (resultList) {

    const date = new Date();
    const err = new Error();
    // setImmediate(() => {

    try {
        for (let i = 0; i < resultList.length; ++i) {
            const result = resultList[i];
            let record;
            if (result.record) {
                record = getRecord(result);
                report(result, err, record);
            }

            if (result.observations) {
                record = record || getRecord(result);
                observe(result, date, record);
            }
            if (result.data_points) {
                record = record || getRecord(result);
                writeDataPoints(result, result.rule, date, record);
            }
            if (result.signals) {
                record = record || getRecord(result);
                writeSignals(result, result.rule, date, record);
            }
            if (result.single_point) {
                const rule = result.rule;
                result.single_point
                    .forEach((line) => {

                        const point = new SqreenSDK.Point(line.signal_name, `single_point:${rule.rulespack}:${rule.name}`);
                        point.payload = line.payload;
                        point.payload_schema = line.payload_schema;
                        point.batch();
                    });
            }
            //$lab:coverage:off$
            if (Fuzzer.hasFuzzer() && result.fuzzer_signals) {
                //$lab:coverage:on$
                const req = getRequest(result);

                //$lab:coverage:off$
                if (Fuzzer.isRequestReplayed(req)) {
                    //$lab:coverage:on$
                    result.fuzzer_signals
                        .forEach((signal) => {

                            Fuzzer.recordSignal(req, signal);
                        });
                }
            }
            if (result.payload) {
                record = record || getRecord(result);
                if (record) {
                    //$lab:coverage:off$
                    if (record.isLegacyRecord === true) {
                        record.reportPayload = true;
                    }
                    else {
                        record._meta.reportPayload = true;
                    }
                    //$lab:coverage:off$
                }
            }
        }
    }
    catch (e) {
        Exception.report(e).catch(() => {});
    }

    // });
};

const actOnCbResult = function (resultList, session) {

    try {
        // modify args one day ? https://github.com/sqreen/Wiki/wiki/Sqreen-callbacks#pre
        if (resultList.length === 0) {
            return null;
        }
        // sometimes, the session is given from the callback: it is particular for the situation where the callback is placed on the eventEmitter and therefore executed BEFORE tracing is enabled
        // a solution would be to place tracing before on the request lifecyle but it would not be the smartest move (why place a tracing if the request/respose objects are always available and might have to be dropped ?)
        session = InstrumentationUtils.getListSession(resultList) || session;

        performRecordAndObservation(resultList);


        for (let i = 0; i < resultList.length; ++i) {

            const result = resultList[i];
            const rule = result.rule || {};

            if (result.status) {

                Logger.INFO(`Sqreen callback returned status ${result.status}`);
                Logger.DEBUG(`Sqreen callback result: ${result}`);

                if (!rule.test || Config.block_all_rules) {
                    if (result.status === CB_STATUS.RAISE) {

                        const onRaise = session.raw && session.raw.get('raise');
                        if (onRaise !== undefined) {
                            for (const cb of onRaise.values()) {
                                cb();
                            }
                        }

                        if (session.req && session.res) {
                            RuleUtil.dropRequest(['', session.req, session.res]);
                            if (!session.req.__sqreen_uuid && getMetrics().getMetricByName(HTTP_CODE)) { // the tracing has not been performed: the request has no id and no tail
                                performRecordAndObservation([{ observations: [[HTTP_CODE, 500, 1]] }]);
                            }
                        }
                        return Object.assign({}, result, { status: CB_STATUS.SKIP });
                    }
                    if (result.status === CB_STATUS.SKIP) {
                        return result;
                    }
                }
            }
        }
        return null;
    }
    catch (e) {
        Exception.report(e).catch(() => {});
        return null;
    }
};

const runUniqueCb = function (method, args, value, rule, selfObject, session, kind, budget, monitBudget) {

    if (rule === undefined) {
        rule = {};
    }

    let currentBudget = budget;
    if (rule.purpose === 'monitoring') {
        currentBudget = monitBudget;
    }

    if (currentBudget === undefined) {
        currentBudget = Budget.INFINITY; // we know that this cb should run
    }

    const noBudget = method.noBudget === true;
    const remain = noBudget === true ? Infinity : currentBudget.remain;


    if (rule.enabled === false) {
        return {};
    }

    if (remain <= 0 && noBudget === false) {
        return {};
    }

    if (rule.purpose === 'reveal') {
        const isFuzzed = session !== undefined && session !== null && Fuzzer.hasFuzzer() === true && Fuzzer.isRequestReplayed(session.req) === true;
        if (!isFuzzed) {
            // skip reveal rules on original requests (default behaviour)
            if (method.revealRunOn !== 'both' && method.revealRunOn !== 'original') {
                return {};
            }
        }
        else {
            // skip reveal rules targeting original requests on fuzzed requests
            if (method.revealRunOn === 'original') {
                return {};
            }
        }
    }

    if (!PreConditions.fillsPreConditions(rule, kind, args, value, selfObject, session)) {
        return {};
    }

    let trigger = null;
    if (rule.sampler !== undefined) {
        trigger = rule.sampler.shouldCollectAndTick();
        if (trigger === null) {
            return {};
        }
    }

    // VM will refuse values under 1ms as a perf budget, let's update remain but not the current budget value
    const timeout = remain;

    return tryThis(
        () => {

            Logger.DEBUG(`Running callback ${rule.name}`);
            currentBudget.start();
            const result = method(args, value, rule, selfObject, session, timeout) || {};
            currentBudget.stop(rule.name, kind);
            result.session = session;
            result.rule = rule;
            result.params = { args, value };
            result.trigger = trigger;
            if (rule.exception_cap !== undefined) {
                rule.enabled = rule.exception_cap.tick(false);
            }
            return result;
        },
        (e) => {

            currentBudget.stop(rule.name, kind);

            let err = e;
            if (!err.stack) {
                err = new Error(err);
            }

            Logger.DEBUG(`cb has failed with ${err}`);

            if (rule.exception_cap !== undefined) {
                rule.enabled = rule.exception_cap.tick(true, err);
            }

            err.ruleName = rule.name;
            err.rulesPack = rule.rulesPack;

            const req = session && session.req;
            // for now, skip exceptions triggered by the fuzzer
            //$lab:coverage:off$
            if (Fuzzer.hasFuzzer() && Fuzzer.isRequestReplayed(req)) {
                //$lab:coverage:on$
                try {
                    Fuzzer.updateRequestMetric(req, 'exceptions.failed_rules', 1, Fuzzer.METRICTYPE.SUM);
                }
                catch (er) {
                    //$lab:coverage:off$
                    Exception.report(er).catch(() => {});
                    //$lab:coverage:on$
                }
                return {};
            }
            let record;
            if (req !== undefined && req !== null && req.__sqreen_uuid !== undefined && (record = findRecord(req)) !== undefined) {

                if (record.isLegacyRecord === true) {
                    record.except({
                        klass: Error.name,
                        message: err.message,
                        infos: {
                            args: err.args,
                            waf: err.waf
                        },
                        rule_name: err.ruleName,
                        time: new Date(),
                        context: {
                            backtrace: err.stack.split('\n')
                        }
                    });
                    return {};
                }

                // Probably cleaner to do that where we do it for attacks too? Or maybe do attack closer to the exit of the cb!
                record.except(err.name,
                    err.message,
                    { args: err.args, waf: err.waf },
                    rule.name,
                    rule.rulesPack,
                    new Date(),
                    e.stack.split('\n').map(Utils.parseStackTraceLine));
                return {};
            }
            Exception.report(err).catch(() => {});
            return {};
        });
};

const runCbs = function (list, args, value, selfObject, kind, session, budget, monitBudget) {

    if (session && session.req && session.req._sqreen_ip_whitelist) {
        return [];
    }

    if (process.__sqreen_cb) { // of the lock is present
        return [];
    }

    const length = list.length;

    const result = new Array(length);
    for (let i = 0; i < length; ++i) {
        if (!list[i].method) {
            result[i] = {};
            continue;
        }
        process.__sqreen_cb = true; // place a lock: two callbacks cannot run at the same time
        result[i] = runUniqueCb(list[i].method, args, value, list[i].rule, selfObject, session, kind, budget, monitBudget);
        process.__sqreen_cb = false; // remove lock
    }

    // setImmediate(() => {

    // fuzzer activity is only reported internally
    //$lab:coverage:off$
    if (session !== undefined && session !== null && Fuzzer.hasFuzzer() === true && Fuzzer.isRequestReplayed(session.req) === true) {
        //$lab:coverage:on$
        try {
            Fuzzer.recordStackTrace(session.req);
        }
        catch (e) {
            //$lab:coverage:off$
            Exception.report(e).catch(() => {});
            //$lab:coverage:on$
        }
    }
    else {
        logExec(list, kind);
    }
    // });
    return result;
};

const hasNoBudgetMethod = function (arr) {

    return !!arr.find((x) => x.method && !!x.method.noBudget);
};

const ALL_PATCHES = [];
class Patch {

    constructor(original, moduleIdentity, holderName, key) {

        this.original = original;
        this.moduleIdentity = moduleIdentity;
        this.holderName = holderName;
        this.key = key;

        this.preCbs = [];
        this.failCbs = [];
        this.postCbs = [];
        this.asyncPostCbs = [];
        this.hasCbs = false;

        this.hasMostNeededCallbacks = false;

        this.instrumented = function () {};

        this.build();
        ALL_PATCHES.push(this);
    }

    register() {

        const self = this;
        Director.register({ // register the function for possible instrumentation
            moduleName: this.moduleIdentity.name,
            version: this.moduleIdentity.version,
            file: this.moduleIdentity.relativePath,
            methodName: this.holderName + (this.holderName ? ':' : '') + this.key,
            updateCallback: function (params) {

                Logger.DEBUG(`updating patch for ${self.moduleIdentity.name}/${self.moduleIdentity.relativePath}.${self.holderName + ':' + self.key}`);
                self.preCbs = params.preCbs || self.preCbs;
                self.failCbs = params.failCbs || self.failCbs;
                self.postCbs = params.postCbs || self.postCbs;
                self.asyncPostCbs = params.asyncPostCbs || self.asyncPostCbs;
                self.hasAsyncCBs = self.asyncPostCbs.length > 0;
                self.hasCbs = self.preCbs.length > 0 || self.failCbs.length > 0 || self.postCbs.length > 0 || self.hasAsyncCBs;
                self.hasMostNeededCallbacks = hasNoBudgetMethod(self.preCbs) || hasNoBudgetMethod(self.failCbs) || hasNoBudgetMethod(self.postCbs) || hasNoBudgetMethod(self.asyncPostCbs);
            }
        });
    }

    runPre(arg, value, selfObject, session, budget, monitBudget) {

        return runCbs(this.preCbs, arg, value, selfObject, 'pre', session, budget, monitBudget);
    }

    runFail(arg, value, selfObject, session, budget, monitBudget) {

        return runCbs(this.failCbs, arg, value, selfObject, 'fail', session, budget, monitBudget);
    }

    runPost(arg, value, selfObject, session, budget, monitBudget) {

        return runCbs(this.postCbs, arg, value, selfObject, 'post', session, budget, monitBudget);
    }

    runAsyncPost(arg, value, selfObject, session, budget) {

        return runCbs(this.asyncPostCbs, arg, value, selfObject, 'asyncPost', session, budget);
    }

    build() {

        const self = this;

        this.construct = function () {

            const res = new (Function.prototype.bind.apply(self.original, [null].concat(Array.from(arguments))))();
            if (Object.isExtensible(res)) {
                Object.defineProperty(res, '__sqreen_constructed', {
                    configurable: false,
                    enumerable: false,
                    writable: false,
                    value: true
                });
                Object.defineProperty(res, 'constructor', {
                    configurable: true,
                    enumerable: false,
                    writable: true,
                    value: self.instrumented
                });
            }
            return res;
        };

        this.instrumented = function () {

            const rawSession = CLS.getNS();

            const session = {
                req: rawSession.get('req'),
                res: rawSession.get('res'),
                // pessimistic, in case of context loss, no cb will run
                budget: rawSession.get('budget') || Budget.ZERO,
                monitBudget: rawSession.get('monitBudget') || Budget.ZERO,
                raw: rawSession
            };

            const __sqreen_cb = process.__sqreen_cb;
            if (((session.budget.remain <= 0 && session.monitBudget.remain <= 0 ) || __sqreen_cb || !self.hasCbs) && self.hasMostNeededCallbacks === false) {
                if (this) {
                    const proto = Object.getPrototypeOf(this);
                    if (!this.__sqreen_constructed && proto && proto.constructor === self.original && proto.hasOwnProperty('constructor')) {
                        return self.construct.apply(this, arguments);
                    }
                }
                return self.original.apply(this, arguments);
            }
            session.budget.startCount(CONST_CB.TYPE.PRE, session.monitBudget);
            const args = leakArgs.apply(this, arguments);
            // Okay actually budget should happen here right?
            if (self.preCbs.length > 0){
                const preAction = actOnCbResult(self.runPre(args, null, this, session, session.budget, session.monitBudget), session);
                if (preAction && preAction.status === CB_STATUS.SKIP) {
                    session.budget.stopCount(session.monitBudget);
                    return preAction.newReturnValue;
                }
            }
            session.budget.stopCount(session.monitBudget);
            const result = tryThis(
                () => {

                    if (this) {
                        const proto = Object.getPrototypeOf(this);
                        if (!this.__sqreen_constructed && proto && proto.constructor === self.original && proto.hasOwnProperty('constructor')) {
                            return self.construct.apply(this, args); // constructor can't be asynchronous right?
                        }
                    }

                    if (self.hasAsyncCBs === true) {
                        const lastArg = args[args.length - 1];
                        if (typeof lastArg === 'function') {
                            // let's assume this last function is a callback function
                            args[args.length - 1] = function () { // Some perversion might happen here based on the function's name or length. Let's keep an eye on this in the future.

                                session.budget.startCount(CONST_CB.TYPE.ASYNC_POST, session.monitBudget);
                                actOnCbResult(self.runAsyncPost(args, leakArgs.apply(this,  arguments), this, session, session.budget), session);
                                session.budget.stopCount(session.monitBudget);
                                // no action possible
                                session.budget.stopCount();
                                return lastArg.apply(this, arguments);
                            };
                        }
                        const callResult = self.original.apply(this, args);
                        if (isPromise(callResult) === true) {
                            return callResult
                                .then((arg) => {

                                    session.budget.startCount(CONST_CB.TYPE.ASYNC_POST, session.monitBudget);
                                    actOnCbResult(self.runAsyncPost(args, arg, this, session, session.budget), session);
                                    session.budget.stopCount(session.monitBudget);
                                    // no action possible

                                    return arg;
                                })
                                .catch((err) => {

                                    session.budget.startCount(CONST_CB.TYPE.ASYNC_POST, session.monitBudget);
                                    actOnCbResult(self.runAsyncPost(args, err, this, session, session.budget), session);
                                    session.budget.stopCount(session.monitBudget);
                                    // no action possible

                                    return Promise.reject(err);
                                });
                        }
                        return callResult;
                    }
                    return self.original.apply(this, args);
                },
                (err) => {

                    session.budget.startCount(CONST_CB.TYPE.FAILING, session.monitBudget);
                    if (self.failCbs.length > 0) {
                        const failAction = actOnCbResult(self.runFail(args, err, this, session, session.budget, session.monitBudget), session);
                        if (failAction && failAction.status === CB_STATUS.SKIP) {
                            session.budget.stopCount(session.monitBudget);
                            return failAction.newReturnValue;
                        }
                    }
                    session.budget.stopCount(session.monitBudget);
                    throw err;
                });

            session.budget.startCount(CONST_CB.TYPE.POST, session.monitBudget);
            if (self.postCbs.length > 0) {
                const postAction = actOnCbResult(self.runPost(args, result, this, session, session.budget, session.monitBudget), session);
                if (postAction && postAction.status === CB_STATUS.SKIP) {
                    session.budget.stopCount(session.monitBudget);
                    return postAction.newReturnValue;
                }
            }
            session.budget.stopCount(session.monitBudget);
            return result;
        };

        Object.setPrototypeOf(this.instrumented, Object.getPrototypeOf(this.original));
        if (this.original.prototype) {
            Object.setPrototypeOf(this.instrumented.prototype, Object.getPrototypeOf(this.original.prototype));
        }

        const memberList = Object.getOwnPropertyNames(this.original);
        for (let i = 0; i < memberList.length; ++i) {
            Object.defineProperty(this.instrumented, memberList[i], Object.getOwnPropertyDescriptor(this.original, memberList[i]));
        }
        this.register();
    }
}

const leakArgs = function () {

    return arguments;
};

const tryThis = function (exec, fail) {

    try {
        return exec();
    }
    catch (err) {
        return fail(err);
    }
};

const callCount = {};
const logExec = function (cbList, kind) {

    // setImmediate(() => {

    if (!countCB()) {
        return;
    }

    for (let i = 0; i < cbList.length; ++i){
        const rule = cbList[i].rule || {};

        const interval = rule.call_count_interval;
        if (!interval) {
            continue;
        }
        const key =  `${rule.rulesPack}/${rule.name}/${kind}`;


        if (callCount[key] >= interval - 1) {

            getMetrics().addObservations([
                [
                    'sqreen_call_counts',
                    key,
                    interval
                ]
            ], new Date());
            callCount[key] = 0;
        }
        else {
            callCount[key] = callCount[key] + 1 || 1;
        }
    }
    // });
};

module.exports = Patch;
module.exports._performRecordAndObservation = performRecordAndObservation;
module.exports._observe = observe;
module.exports._runCbs = runCbs;
module.exports._report = report;
module.exports._actOnCbResult = module.exports.actOnCbResult = actOnCbResult;
module.exports.removeAllCallbacks = function () {

    Director.clearWaitings();
    for (let i = 0; i < ALL_PATCHES.length; ++i) {
        const patch = ALL_PATCHES[i];
        patch.hasCbs = false;
        patch.preCbs = [];
        patch.failCbs = [];
        patch.postCbs = [];
        patch.asyncPostCbs = [];
    }
};
module.exports._logExec = logExec;
module.exports.isPromise = isPromise;
