/**
 * Copyright (c) 2016 - 2019 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const Http = require('http');


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

const keptClaims = ['params', 'query', 'headers', 'body', 'cookies', 'url', 'originalUrl', 'method', '__sqreen_url', 'urls']; // mostly express here
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

// AsJson
const clean = function (obj, seen, target) {

    if ((typeof obj !== 'object' && typeof obj !== 'function') || !obj) {
        return obj;
    }

    if (seen.has(obj)) {
        return {};
    }

    let result = target || {};

    if (Array.isArray(obj)) {
        result = [];
    }

    seen.add(obj);

    const keys = Object.keys(obj);
    for (let i = 0; i < keys.length; ++i) {
        const key = keys[i];
        const descriptor = Object.getOwnPropertyDescriptor(obj, key);
        if (descriptor.get || descriptor.set) {
            Object.defineProperty(result, key, descriptor);
        }
        else {
            const cleaned = clean(obj[key], seen);
            result[key] = cleaned;
            if (cleaned === null || cleaned === undefined) {
                result[key] = {};
            }
        }
    }

    return result;
};

const starter = function (obj) {

    return clean(obj, new Set(), {});
};

module.exports.asJson = starter;

