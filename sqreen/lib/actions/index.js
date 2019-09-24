/**
 * Copyright (c) 2016 - 2019 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const Hoek = require('hoek');
const IPRouter = require('ip-router');
const IP = require('ip');
const Logger = require('../logger');
const Feature = require('../command/features');

const CBUtils = require('../rules/rules-callback/utils');

const ipStore = module.exports._ipStore = new IPRouter();
let blockedUsers = new Set();
let redirectUsers = new Set();
const timeOuts = new Set();

const cleanAllTimeout = function () {

    timeOuts.forEach((timeout) => {

        clearTimeout(timeout);
        timeOuts.delete(timeout);
    });
};

const init = module.exports.init = function () {

    ipStore.clear();
    blockedUsers = new Set();
    redirectUsers = new Set();
    cleanAllTimeout();
};

const ACTION = {
    BLOCK_IP: 'block_ip',
    REDIRECT_IP: 'redirect_ip',
    BLOCK_USER: 'block_user',
    REDIRECT_USER: 'redirect_user'
};

const report = function (actionName, output, req, action_id) {

    const SDK = require('../sdk/index');

    return SDK._track(`sq.action.${actionName}`, {
        properties: {
            output,
            action_id
        }

    }, req);
};

const placeInSetFor = function (item, set, duration) {

    duration = (duration || 0) * 1000; //(s => ms)
    set.add(item);
    if (duration > 0) {
        const tm = setTimeout(() => {

            set.delete(item);
        }, duration);
        timeOuts.add(tm);
    }
};

const flagIPFor = function (item, action, duration) {

    duration = (duration || 0) * 1000; //(s => ms)
    ipStore.insert(item, action);
    if (duration > 0) {
        const tm = setTimeout(() => {

            ipStore.erase(item);
        }, duration);
        timeOuts.add(tm);
    }
};

const ACTION_CALLBACK = {
    [ACTION.BLOCK_IP](parameters, duration, id) {

        const ip_cidr_list = parameters.ip_cidr;
        const action = { action: ACTION.BLOCK_IP, id };
        if (Array.isArray(ip_cidr_list) === true) {
            ip_cidr_list.forEach((ip_cidr) => {
                flagIPFor(ip_cidr, action, duration);
            });
        }
        else {
            flagIPFor(ip_cidr_list, action, duration);
        }
        return true;
    },
    [ACTION.REDIRECT_IP](parameters, duration, id) {

        const ip_cidr_list = parameters.ip_cidr;
        const url = parameters.url;
        if (typeof url !== 'string') {
            throw new Error(`Cannot create redirect action as ${parameters.url} is not a string.`);
        }
        const action = { action: ACTION.REDIRECT_IP, id, url };
        if (Array.isArray(ip_cidr_list) === true) {
            ip_cidr_list.forEach((ip_cidr) => {
                flagIPFor(ip_cidr, action, duration);
            });
        }
        else {
            flagIPFor(ip_cidr_list, action, duration);
        }
        return true;
    },
    [ACTION.BLOCK_USER](parameters, duration, id) {

        if (!parameters.users || !Array.isArray(parameters.users)) {
            throw new Error(`bad action parameters ${JSON.stringify(parameters)}`);
        }
        const todo = { users: parameters.users, id };
        placeInSetFor(todo, blockedUsers, duration);
        return true;
    },
    [ACTION.REDIRECT_USER](parameters, duration, id) {

        if (!parameters.users || !Array.isArray(parameters.users)) {
            throw new Error(`bad action parameters ${JSON.stringify(parameters)}`);
        }
        const url = parameters.url;
        if (!url) {
            throw new Error(`${ACTION.REDIRECT_USER} action created without target url`);
        }

        const users = parameters.users;
        Logger.INFO(`Redirecting user ${JSON.stringify(users)} to ${url} for ${duration} seconds. ${{id}}`);
        const todo = { users, url, id };
        placeInSetFor(todo, redirectUsers, duration);
        return true;
    }
};

module.exports.userIsBanned = function (user, req) {

    for (const action of blockedUsers) {
        for (const usr of action.users) {
            if (Hoek.deepEqual(user, usr)) {
                CBUtils.dropRequest(['', req, req.__sqreen_res]);
                report(ACTION.BLOCK_USER, user, req, action.id);
                return true;
            }
        }
    }

    for (const action of redirectUsers) {
        for (const usr of action.users) {
            if (Hoek.deepEqual(user, usr)) {
                CBUtils.redirectRequest(['', req, req.__sqreen_res], action.url);
                report(ACTION.REDIRECT_USER, user, req, action.id);
                return true;
            }
        }
    }
    return false;
};

const ALREADY_RESPONSED_REQUESTS = new WeakSet();
module.exports.shouldLetThisGo = function (req, res, ip) {

    if (ALREADY_RESPONSED_REQUESTS.has(req)) { // we have already done something on that request!
        return false;
    }

    let action;
    try {
        if (ip === '' || IP.isV4Format(ip) === false && IP.isV6Format(ip) === false) {
            return true;
        }
        action = ipStore.route(ip);
        if (action === undefined || action === null || typeof action !== 'object') {
            return true;
        }
    }
    catch (e) {
        require('../exception').report(e).catch(() => {});
        return true;
    }
    if (action.action === ACTION.BLOCK_IP) {
        CBUtils.dropRequest(['', req, res]);
        report(ACTION.BLOCK_IP, {ip_address: ip}, req, action.id);
        ALREADY_RESPONSED_REQUESTS.add(req);
        return false;
    }
    // It is not possible to fall in another case
    // if (action.action === ACTION.REDIRECT_IP) {
    const target = action.url;
    CBUtils.redirectRequest(['', req, res], target);
    report(ACTION.REDIRECT_IP, {ip_address: ip}, req, action.id);
    ALREADY_RESPONSED_REQUESTS.add(req);
    return false;
    //}
};

const applyAction = function (action, parameters, duration, id) {

    if (ACTION_CALLBACK[action] === undefined) {
        throw new Error(`unsupported action ${action}`);
    }

    return ACTION_CALLBACK[action](parameters, duration, id);
};

module.exports.enforceActionList = function (list) {

    init();
    const failedList = [];
    const max = Feature.read().max_radix_size;
    if (!list) {
        const msg = `Received ${list} as action list from BackEnd`;
        Logger.INFO(msg);
        require('../exception/index').report(new Error(msg)).catch(() => {});
        return [];
    }
    list.forEach((action) => {

        let failed = false;
        try {
            failed = !applyAction(action.action, action.parameters, action.duration, action.action_id);
            const size = ipStore.size();
            if (size > max) {
                const msg = `Tried to add more than ${size} IP addresses in security responses. MAX: ${max}`;
                Logger.INFO(msg);
                throw new Error(msg);
            }
        }
        catch (e) {
            require('../exception/index').report(e).catch(() => {});
            failed = true
        }
        if (failed === true) {
            failedList.push(action.action_id);
        }
    });
    return failedList;
};

