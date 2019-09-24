/**
 * Copyright (c) 2016 - 2019 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const Path = require('path');

const SEP = Path.sep;

const Logger = require('../logger');
const Module = require('module');
const Patcher = require('./patcher');
const ModuleIdentity = require('./moduleIdentity');
const Tracing = require('./hooks/tracingHook');
const Hooks = require('./hooks');
const Templateengines = require('./templateEngines');
const Exception = require('../exception');

const DO_NOT_HJ = [
    'continuation-local-storage',
    'shimmer',
    'module', // do not touch this critical core module (Newrelic does not like that either)
    'bindings', // this module will access weird stacktraces...
    'tapable',
    'require-dir'
];

const load = Module._load;

const NativeModule_source = process.binding('natives');
const isNative = function (id) {

    return NativeModule_source.hasOwnProperty(id); //https://github.com/nodejs/node/blob/5de3cf099cd01c84d1809dab90c041b76aa58d8e/lib/internal/bootstrap_node.js#L471
};
const nativeCache = {};

const logErr = function (err, request) {

    Logger.DEBUG(err.message);
    err.message = err.message + ' - ' + request;
    Exception.report(err)
        .catch(() => {});
};

module.exports.enable = function () {

    Logger.DEBUG('Sqreen enables instrumentation of modules');

    Module._load = function (request, parent) { // replace the Module._load method

        // https://github.com/opbeat/require-in-the-middle/blob/master/index.js indicates that an error might appears in case of circular dependencies... to be watched

        let file = '';
        try {
            file = Module._resolveFilename(request, parent); // only unique identifier of a module: its full path from the system root
        }
        catch (err) {
            // strip Sqreen from stacktrace
            err.stack = err.stack.split('\n').filter((x) => !x.includes(`lib${SEP}instrumentation${SEP}moduleHijacker.js`)).join('\n');
            throw err;
        }

        // do not cache something that is not hijacked (rely on core cache)
        // see core method https://github.com/nodejs/node/blob/master/lib/module.js#L420
        // and alias https://github.com/nodejs/node/blob/master/lib/internal/module.js#L37
        if (Module._cache[file]) { // have we already patched this file ?
            return Module._cache[file].exports;
        }

        const loadedModule = load.apply(this, arguments); // effective load of the module

        if (DO_NOT_HJ.indexOf(request) > -1) {
            return loadedModule;
        }

        const identity = ModuleIdentity.scan(request, parent);

        if (identity.core && isNative(request)) {
            // native modules have a secret cache that will not be tempered https://github.com/nodejs/node/blob/5de3cf099cd01c84d1809dab90c041b76aa58d8e/lib/internal/bootstrap_node.js#L441
            if (nativeCache[file]) {
                return nativeCache[file];
            }
            nativeCache[file] = loadedModule;
        }


        if (request === 'http' || request === 'https') { // specific hook to trace http requests
            try {
                Tracing.enable(loadedModule, identity);
            }
            catch (err) {
                logErr(err, request);
            }
        }

        try {
            Patcher.patchModule(loadedModule, identity, request);
        }
        catch (err) {
            Logger.DEBUG(`could not patch module ${request}: ${err.message}`);
            logErr(err);
        }


        if (Hooks.hasOwnProperty(request)) {
            try {
                Hooks[request](identity, loadedModule);
            }
            catch (err) {
                logErr(err, request);
            }
        }

        try {
            Templateengines.hook(request);
        }
        catch (e) {
            logErr(e, request);
        }

        return loadedModule;
    };
};
