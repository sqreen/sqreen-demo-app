/**
 * Copyright (c) 2016 - 2020 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const Http = require('http');

const MAX_STRINGS_SIZE = 4 * 1024;
const MAX_RECURSIVE_DEPTH = 15;
const MAX_PROP_PER_OBJECT = 150;

const response = {
    answer: function (args) {

        args[2].writeHead(500);
        if (args[2].__original_end) {
            args[2].__original_end();
        }
        else {
            args[2].end(); // respond with a 500 error
        }
    }
};

// hack due to a circular dep
module.exports.init = function () {

    const FunctionPatcher = require('../../instrumentation/functionPatcher');
    FunctionPatcher.patchFunction(response, 'answer', { name: 'sqreen' }, 'dropRequest');
};

const drop = function (args) {

    args[2].__sqreen_finisehd = true;
    args[2]._header = null;
    args[2].finished = true;

    args[2] = new Http.ServerResponse({ method: '' }); // create a new response object for framework to write in

    args[1].socket.end(); // prevent the client from writing in the request socket anymore
    args[1] = new Http.IncomingMessage(args[1].socket); // create a new harmless request object that will be dropped by frameworks
    args[1].method = 'OPTIONS';
};

module.exports.redirectRequest = function (args, url) {

    args[2].writeHead(303, {
        Location: url
    });
    if (args[2].__original_end) { // end is safe to this.finished (it returns this)
        args[2].__original_end();
    }
    else {
        args[2].end(); // respond with a 500 error
    }
    drop(args);
};

// in the future, this method may not be used if the framework has a specific instrumentation
module.exports.dropRequest = function (args) {

    response.answer(args);
    drop(args);
};

const keptClaims = ['params', 'query', 'headers', 'body', 'cookies', 'url', 'originalUrl', 'method', '__route', '__sqreen_url', '__sqreen_replayed', 'urls']; // mostly express here
module.exports.getLookableClaims = function (request) {
// TODO: make that clear !!
    if (!request) {
        return {};
    }

    // TODO: cache shall be smarter: i.e. body processed after cache is not taken
    /*
    if (request.__sqreen_lookable) {
        return request.__sqreen_lookable;
    }
    */

    const result = {};

    if (request.__sqreen) {
        request.__sqreen.lookup = request.__sqreen.lookup || {};

        // hapi specific code (see https://github.com/hapijs/hapi/blob/master/API.md#request-object)
        // expect return value of ["lib/request.js"]["prototype:request"] attached to session.req.__sqreen.hapi[0].value
        // TODO: attach rule
        if (request.__sqreen.hapi && request.__sqreen.hapi[0] && request.__sqreen.hapi[0].value) {
            request.__sqreen.lookup.hapi = {
                params: request.__sqreen.hapi[0].value.params,
                query: request.__sqreen.hapi[0].value.query,
                // headers: request.__sqreen.hapi.headers, // header already taken from raw request
                payload: request.__sqreen.hapi[0].value.payload
            };
        }

        result.__sqreen_lookup = request.__sqreen.lookup;
    }

    for (let i = 0; i < keptClaims.length; ++i) {
        const key = keptClaims[i];
        if (request[key]) {
            result[key] = request[key];
        }
    }

    if (request.connection) {
        result.connection = {};
        result.connection.remoteAddress = request.connection.remoteAddress;
    }

    request.__sqreen_lookable = result;

    return result;
};

const lookupAuthClaims = ['username', 'login', 'displayname', 'nickname', 'email', 'emailaddress', 'name', 'id'];
module.exports.findLoginArtifact = function (user) {

    // detect if the user is a mongoose object (TODO: is there a better way to do it without including mongoose into the deps?)

    let target = user;
    if (!!user._doc && user.constructor && user.constructor.name === 'model') {
        target = user._doc;
    }

    const keys = Object.keys(target);
    for (let i = 0; i < lookupAuthClaims.length; ++i) {
        for (let j = 0; j < keys.length; ++j) {
            if (keys[j].toLowerCase().includes(lookupAuthClaims[i]) && !!target[keys[j]]) {
                return { key: keys[j], value: target[keys[j]] };
            }
        }
    }
    return {};
};


const CLEAN_CACHE = new WeakMap();
const starter = function (obj) {

    if (typeof obj !== 'object' || obj === null) {
        return obj;
    }

    const cached = CLEAN_CACHE.get(obj);
    if (cached === undefined) {
        const res = limitObject(obj, 0);
        CLEAN_CACHE.set(obj, res);
        return res;
    }

    return cached;
};

module.exports.asJson = starter;


const miniCopy = function (obj, ignore) {

    if (Array.isArray(obj) === true) {
        return obj.slice(0, MAX_PROP_PER_OBJECT);
    }
    const res = {};
    const keys = Object.keys(obj);
    const ln = Math.min(keys.length, MAX_PROP_PER_OBJECT);
    for (let i = 0; i < ln; ++i) {
        if (ignore.indexOf(keys[i]) > -1) {
            continue;
        }
        res[keys[i]] = obj[keys[i]];
    }
    return res;
};
// TODO: limit size of keys too
const limitObject = module.exports.limitObject = function (obj, depth) {

    if (depth === undefined) {
        depth = 0;
    }

    if (depth >= MAX_RECURSIVE_DEPTH) {
        return null;
    }
    if (obj === null) {
        return null;
    }

    if (typeof obj === 'string' && obj.length >= MAX_STRINGS_SIZE) {
        return obj.slice(0, MAX_STRINGS_SIZE);
    }

    if (typeof obj === 'object') {
        const keys = Object.keys(obj);
        const changed = {};
        const del = [];
        for (let i = 0; i < keys.length; ++i) {
            const key = keys[i];
            if (key.length > MAX_STRINGS_SIZE) {
                del.push(key);
                continue;
            }
            const item = obj[key];
            const res = limitObject(item, depth + 1);
            if (res === item) {
                continue;
            }
            changed[key] = res;
        }
        const changedKeys = Object.keys(changed);
        if (changedKeys.length > 0 || del.length > 0) {
            // we need to clone the current object
            const newObj = miniCopy(obj, del);
            Object.assign(newObj, changed);
            return newObj;
        }
    }

    return obj;
};

/**
 * concat without new array creation
 * @param a1
 * @param a2
 */
const pushAll = function (a1, a2) {

    for (let i = 0; i < a2.length; ++i) {
        a1.push(a2[i]);
    }
};

/**
 * get flat keys in the limit of size defined
 * @param item
 * @param depth
 * @return {[]|Array}
 */
const flat_keys = module.exports.flat_keys = function (item, depth) {

    if (depth === undefined) {
        depth = 0;
    }
    if (depth >= MAX_RECURSIVE_DEPTH) {
        return [];
    }

    if (typeof item !== 'object') {
        return [];
    }

    if (item === null) {
        return [];
    }
    const result = [];
    const keys = Object.keys(item);
    const ln = Math.min(MAX_PROP_PER_OBJECT, keys.length);
    for (let i = 0; i < ln; ++i) {
        const k = keys[i];
        if (k.length <= MAX_STRINGS_SIZE) {
            result.push(k);
        }
        else {
            result.push(k.slice(0, MAX_STRINGS_SIZE));
        }
        if (typeof item[k] === 'object') {
            pushAll(result, flat_keys(item[k], depth + 1));
        }
        if (result.length > MAX_PROP_PER_OBJECT) {
            return result.slice(0, MAX_PROP_PER_OBJECT);
        }
    }
    return result;
};

/**
 * glat values within limits
 * @param item
 * @param depth
 * @return {[]|Array}
 */
const flat_values = module.exports.flat_values = function (item, depth) {

    if (depth === undefined) {
        depth = 0;
    }

    if (depth >= MAX_RECURSIVE_DEPTH) {
        return [];
    }

    if (typeof item !== 'object') {
        return [item];
    }

    if (item === null) {
        return [];
    }
    const result = [];
    const keys = Object.keys(item);
    const ln = Math.min(MAX_PROP_PER_OBJECT, keys.length);
    for (let i = 0; i < ln; ++i) {
        const k = keys[i];
        const val = item[k];
        if (typeof val === 'object') {
            pushAll(result, flat_values(item[k], depth + 1));
        }
        else if (typeof val === 'string') {
            if (val.length <= MAX_STRINGS_SIZE) {
                result.push(val);
            }
            else {
                result.push(val.slice(0, MAX_STRINGS_SIZE));
            }
        }
        else {
            result.push(val);
        }
        if (result.length > MAX_PROP_PER_OBJECT) {
            return result.slice(0, MAX_PROP_PER_OBJECT);
        }
    }
    return result;
};

