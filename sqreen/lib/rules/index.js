/**
 * Copyright (c) 2016 - 2019 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const Logger = require('../logger');
const Reader = require('./reader');
const Exception = require('../exception');
const Hoek = require('../../vendor/hoek/lib/index');
const Callbacks = require('./rules-callback');
const Director = require('../instrumentation/sqreenDirector');
const CallbackBuilder = require('./rules-callback/callbackBuilder');
const Metric = require('../metric');
const Cap = require('./exceptions');


module.exports.rulespack = '';

const getCallbacks = module.exports._getCallbacks = function (rule) {

    const hookpoint = rule.hookpoint;
    if (hookpoint.callback_class) {
        Hoek.assert(!!Callbacks[hookpoint.callback_class], `callback ${hookpoint.callback_class} is unknown`);
        return Callbacks[hookpoint.callback_class](rule);
    }
    else if (rule.callbacks) {
        return CallbackBuilder.getCbs(rule);
    }

    throw new Error(`no 'callbacks' nor 'hookpoint.callback_class' in rule ${rule}`);
};

const getHookPoint = module.exports._getHookPoint = function (hookPoint) {

    Hoek.assert(!!hookPoint.klass, 'key \'hookpoint.klass\' does not exist in rule');

    const target = hookPoint.klass; // moduleName#version:file
    let file = '';
    let versions = '';

    const hasVersion = target.indexOf('#') > -1;
    const hasFile = target.indexOf(':') > -1;

    const segments = target.split(/[#:]/g);
    if (hasFile) {
        file = segments.pop();
    }
    if (hasVersion) {
        versions = segments.pop();
    }
    const moduleName = segments.pop();

    Hoek.assert(!!moduleName, `could not find module name in ${target}`);

    const method = hookPoint.method || '';

    return {
        target: target + '::' + method,
        moduleName,
        methodName: method,
        file,
        versions
    };
};

const loadRuleList  = module.exports._loadRuleList = function (ruleList, doNotVerifySignature) {

    const result = [];

    for (let i = 0; i < ruleList.length; ++i) {

        const rule = ruleList[i];

        try {
            Reader.verifyRule(rule, doNotVerifySignature); // FIXME, should not verify the version here
        }
        catch (err) {
            // if a rule does not have a valid signature, the whole rulespack is refused.
            Logger.DEBUG(`Rule ${rule.title} invalid: ${err} in pack ${rule.rulesPack}`);
            Exception.report(err).catch(() => {});
            return [];
        }

        try {
            Hoek.assert(!!rule.hookpoint, 'key \'hookpoint\' does not exist in rule');
            const hookpoint = getHookPoint(rule.hookpoint);
            hookpoint.getCallbacks = () => ({ callbacks: getCallbacks(rule), rule });
            hookpoint.rule = rule;
            result.push(hookpoint);
        }
        catch (err) { // there is something wrong with this rule, let the backend know about it
            Logger.DEBUG(`Rule ${rule.title} invalid: ${err}`);
            Exception.report(err).catch(() => {});
        }
    }

    return result;
};

const UpdatePayload = module.exports._UpdatePayload = class {

    constructor(point) {

        this.moduleName = point.moduleName;
        this.methodName = point.methodName;
        this.file = point.file;
        this.versions = point.versions;
        this.getCallbacks = [];
        this.params = {
            preCbs: [],
            postCbs: [],
            failCbs: [],
            asyncPostCbs: []
        };
    }

    build() {

        this.params.preCbs = [];
        this.params.postCbs = [];
        this.params.failCbs = [];
        this.params.asyncPostCbs = [];

        this.getCallbacks.forEach((getCbs) => {

            const res = getCbs();
            const rule = res.rule;

            if (res.callbacks.pre) {
                this.params.preCbs.push({ method: res.callbacks.pre, rule });
            }
            if (res.callbacks.post) {
                this.params.postCbs.unshift({ method: res.callbacks.post, rule });
            }
            if (res.callbacks.fail) {
                this.params.failCbs.unshift({ method: res.callbacks.fail, rule });
            }
            if (res.callbacks.async_post) {
                this.params.asyncPostCbs.unshift({ method: res.callbacks.async_post, rule });
            }
        });
    }
};

const collectHookPointsInstructions = module.exports._collectHookPointsInstructions = function (hookPointList) {

    const result = {};

    for (let i = 0; i < hookPointList.length; ++i) {

        const point = hookPointList[i];
        if (!result[point.target]) {
            result[point.target] = new UpdatePayload(point);
        }
        const goal = result[point.target];

        goal.getCallbacks.push(point.getCallbacks);
    }

    return result;
};

module.exports.enforceRuleList = function (ruleList, doNotVerifySignature) {

    Logger.INFO(`load ${ruleList.length} rules`);

    ruleList.forEach((rule) => {

        if (rule.purpose === 'monitoring') {
            rule.exception_cap = new Cap(rule);
        }
    });

    const enforcable = collectHookPointsInstructions(loadRuleList(ruleList, doNotVerifySignature));

    const keys = Object.keys(enforcable);
    if (keys.length === 0) {
        return false;
    }

    // do metric related operations:
    ruleList.map((r) => r.metrics).reduce((a, b) => a.concat(b), []).forEach(Metric.getMetric);


    for (let i = 0; i < keys.length; ++i) {
        try {
            Director.update(enforcable[keys[i]]);
        }
        catch (err) {
            Logger.DEBUG(err);
        }
    }

    module.exports.rulespack = ruleList[0].rulesPack;

    return true;
};
