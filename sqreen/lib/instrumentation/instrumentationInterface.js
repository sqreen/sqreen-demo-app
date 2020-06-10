/**
 * Copyright (c) 2016 - 2020 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const Logger = require('../logger');
const Exception = require('../exception');
const EventEmitter = require('events').EventEmitter;
const Fuzzer = require('../fuzzer');
const EcosystemInterface = require('../ecosystem/ecosystemInterface');
const Shimmer = require('shimmer');

const NAME = 'instrumentation';
const instrumentationInterface = module.exports = new EcosystemInterface(NAME);

instrumentationInterface.loader = new EventEmitter();

instrumentationInterface.strategies = {};
instrumentationInterface.strategies.patchEventListeners = function (holder, eventName, getHook) {

    try {
        const addListener = holder.addListener;
        holder.addListener = function (event, listener) {

            if (eventName === event && typeof listener === 'function') {
                arguments[1] = getHook(listener);
            }
            addListener.apply(this, arguments);
        };
        holder.on = holder.addListener; // see core: lib/events: EventEmitter.prototype.on = EventEmitter.prototype.addListener;
    }
    catch (err) {
        //$lab:coverage:off$
        Logger.DEBUG(err.message);
        Exception.report(err)
            .catch(() => {});
        //$lab:coverage:on$
    }
};

// FIXME: Reveal should go in ecosystem
// FIXME: not called!!!!
instrumentationInterface.registerHttpServerForReveal = function (server) {

    //$lab:coverage:off$
    if (Fuzzer.hasFuzzer()) {
        Fuzzer.registerServer(server);
    }
    //$lab:coverage:on$
};

instrumentationInterface.strategies.patchFunction = function () {

    return require('./functionPatcher').patchFunction.apply(this, arguments);
};

const startCount = function (session) {

    const budget = session.get('budget');
    if (budget) {
        budget.startCount();
    }
};

const stopCount = function (session) {

    const budget = session.get('budget');
    if (budget) {
        budget.stopCount();
    }
};

instrumentationInterface.strategies.massWrap = function (module, nameList, pre) { // this looks more and more like callbacks. but is still lighter

    // TODO: replace by callback as this mus run befor dynamic cbs eventually
    // -> let's do that later anyway
    Shimmer.massWrap(module, nameList, (original) => {

        return function () {

            const session = require('./hooks/ns').getNS();
            startCount(session);
            try {
                pre(this, arguments);
            }
            catch (e) {
                require('../exception').report(e).catch(() => {});
            }
            stopCount(session);
            return original.apply(this, arguments);
        };
    });
};
