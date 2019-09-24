/**
 * Copyright (c) 2016 - 2019 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';

const bindThis = require('../rules/rules-callback/callbackBuilder').bindThis;
const getCleanSession = require('../rules/rules-callback/callbackBuilder').getCleanSession;

const Binder = class {

    constructor(data) {

        this.data = data || {};
    }
};
Binder.prototype.bindThis = bindThis;

const MAX_HASH_DEPTH = 25;
const hashValIncludes = function (str, obj, minValueSize, depth) {

    if (!obj) {
        return true;
    }

    if (depth >= MAX_HASH_DEPTH) {
        return false;
    }
    const keys = Object.keys(obj);
    for (let i = 0; i < keys.length; ++i) {
        if (typeof obj[keys[i]] === 'object') {
            if (hashValIncludes(str, obj[keys[i]], minValueSize, depth + 1)) {
                return true;
            }
        }
        else if (typeof obj[keys[i]] === 'string' && obj[keys[i]].length >= minValueSize) {
            if (str.indexOf(obj[keys[i]]) > -1) {
                return true;
            }
        }
    }
    return false;
};

const operators = {
    '%and': (a, b) => a && b,
    '%or': (a, b) => a || b,
    '%equals': (a, b) => a === b,
    '%not_equals': (a, b) => a !== b,
    '%gt': (a, b) => a > b,
    '%gte': (a, b) => a >= b,
    '%lt': (a, b) => a < b,
    '%lte': (a, b) => a <= b,
    '%include': (a, e) => a && a.indexOf && a.indexOf(e) > -1,
    '%hash_val_include': (str, obj, minValueSize) => hashValIncludes(str, obj, minValueSize, 0)
};

const evalPreCond = function (condition, binder, args, value, selfObject, session) {

    if (typeof condition === 'string') {
        return binder.bindThis(condition, args, value, selfObject, session);
    }
    if (typeof condition === 'object') {
        const keys = Object.keys(condition);
        const conditionKey = keys[0];
        if (conditionKey === undefined || operators[conditionKey] === undefined) {
            return false;
        }
        return operators[conditionKey].apply(null, condition[conditionKey].map((item) => evalPreCond(item, binder, args, value, selfObject, session)));
    }
    return condition;
};

module.exports.fillsPreConditions = function (rule, kind, args, value, selfObject, session) {

    kind = (kind === 'fail') ? 'failing' : kind;
    if (!rule || !rule.conditions || !rule.conditions[kind] || Object.keys(rule.conditions[kind]).length === 0) {
        // if there is no good condition, it passes the test
        return true;
    }

    const binder = new Binder(rule.data);
    session = getCleanSession(session);

    return !!evalPreCond(rule.conditions[kind], binder, args, value, selfObject, session);
};

module.exports._hashValIncludes = hashValIncludes;
module.exports.evalPreCond = module.exports._evalPreCond = evalPreCond;
module.exports.Binder = Binder; // This should go to callbak builder somedays.
