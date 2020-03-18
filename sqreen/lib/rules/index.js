/**
 * Copyright (c) 2016 - 2020 Sqreen. All Rights Reserved.
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
const Cap = require('./exceptions');
const Sampling = require('../signals/sampling');
const Config = require('../config').getConfig();

const getMetric = function () {

    const Feature = require('../command/features');
    if (Feature.featureHolder.use_signals === true) {
        return require('../metric');
    }
    return require('../../lib_old/metric');
};


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

const prepareRuleList = function (ruleList) {

    ruleList.forEach((rule) => {

        if (rule.purpose === 'monitoring') {
            rule.exception_cap = new Cap(rule);
        }
        if (rule.sampling !== undefined) {
            rule.sampler = new Sampling.Sampler(rule.sampling);
        }
    });
};

module.exports.enforceRuleList = function (ruleList, doNotVerifySignature) {

    Logger.INFO(`load ${ruleList.length} rules`);

    prepareRuleList(ruleList);

    let hookpoints = loadRuleList(ruleList, doNotVerifySignature);

    // load local rules (without checking signatures if asked)
    if (Config && Array.isArray(Config._local_rules)) {
        const local_rules = Hoek.clone(Config._local_rules);
        prepareRuleList(local_rules);
        // enforce rules pack as local
        local_rules.forEach((rule) => {

            rule.rulesPack = 'local';
        });

        ruleList = ruleList.concat(local_rules);
        hookpoints = hookpoints.concat(loadRuleList(local_rules, !Config.rules_verify_signature));
    }

    const enforcable = collectHookPointsInstructions(hookpoints);

    const keys = Object.keys(enforcable);
    if (keys.length === 0) {
        return false;
    }

    // do metric related operations:
    const rulesPack = ruleList[0].rulesPack || '';
    for (let i = 0; i < ruleList.length; ++i) {
        const rule = ruleList[i];
        const metrics = rule.metrics || [];
        metrics.forEach((met) => {

            getMetric().getMetric(met, {}, `sqreen:rule:${rulesPack}:${rule.name}`);
        });
    }


    for (let i = 0; i < keys.length; ++i) {
        try {
            Director.update(enforcable[keys[i]]);
        }
        catch (err) {
            Logger.DEBUG(err);
        }
    }

    module.exports.rulespack = rulesPack;

    return true;
};
