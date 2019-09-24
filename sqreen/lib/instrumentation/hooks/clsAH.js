/**
 * Copyright (c) 2016 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
/**
 * Code modified from https://github.com/othiym23/node-continuation-local-storage by Forrest L Norvell (othiym23)
 * Original code is under BSD-2-Clause license with the following copyright
 * ```
 * Copyright (c) 2013-2016, Forrest L Norvell <ogd@aoaioxxysz.net>
 * All rights reserved.
 * ```
 */
'use strict';
// coverage is broken on Node.js nightly builds
//$lab:coverage:off$
const AsyncHooks = require('async_hooks');

const Assert = require('assert');
const WrapEmitter = require('emitter-listener');

let listenerCount = 0;

const asyncListenerMap = new Map();
/**
 * list of asyncIds linked to an HTTP request
 * @type {WeakMap<http.ClientRequest, [number]>}
 */
const ReqMap = new WeakMap();

/**
 * Set of active linked to an HTTP request
 * @type {WeakMap<http.ClientRequest, Set<Object>>}
 */
const Actives = new WeakMap();

/**
 * Links an asyncId to an HTTP request
 * @param req
 * @param id
 */
const addRecord = function (req, id) {

    if (typeof req !== 'object' || req === null) {
        return;
    }

    let line = ReqMap.get(req);
    if (!line) {
        line = [];
        ReqMap.set(req, line);
    }
    line.push(id);
};

/**
 * Links an active to an HTTP request
 * @param req
 * @param act
 */
const addActive = function (req, act) {

    if (typeof req !== 'object' || req === null) {
        return;
    }
    let set = Actives.get(req);
    if (!set) {
        set = new Set();
        Actives.set(req, set);
    }
    set.add(act);
};

const AsyncListener = class {

    constructor(hooks) {

        this.create = hooks.create;
        this.before = hooks.before;
        this.after = hooks.after;
        this.error = hooks.error;

        this.store = new Map();

        process.sqreenAsyncListener = this;

        const self = this;
        this.hook = AsyncHooks.createHook({
            init(asyncId) {

                const store = self.create();
                self.store.set(asyncId, store);
                if (store && store.req) {
                    addRecord(store.req, asyncId);
                }
            },
            before(asyncId) {

                if (self.store.has(asyncId)) {
                    self.before(null, self.store.get(asyncId));
                }
            },
            after(asyncId) {

                if (self.store.has(asyncId)) {
                    self.after(null, self.store.get(asyncId));
                }
            },
            destroy(asyncId) {

                self.store.delete(asyncId);
            }
        });

        this.id = ++listenerCount;
        asyncListenerMap.set(this.id, this); // TODO: use this instead of process global
    }

    /**
     * From an HTTP request, cleanup all AsyncIds and actives pointing to this request
     * @param req
     */
    cleanup(req) {

        const idList = ReqMap.get(req);
        if (idList) {
            for (let i = 0; i < idList.length; ++i) {
                this.store.delete(idList[i]);
            }
        }
        const activeList = Actives.get(req);
        if (activeList) {
            for (const active of activeList) {
                active.req = null;
                active.res = null;
                active.budget = null;
                const namespace = process.sqreen_namespaces.sqreen_session;
                namespace._set = namespace._set.filter((x) => x !== active);
            }
        }
    }

    enable() {

        this.hook.enable();
    }

    disable() {

        this.hook.disable();
    }
};

const addAsyncListener = function (hooks) {

    const asyncListener = new AsyncListener(hooks);
    asyncListener.enable();
    return asyncListener.id;
};

const removeAsyncListener = function (id) {

    if (!asyncListenerMap.has(id)) {
        return;
    }
    const asyncListener = asyncListenerMap.get(id);
    asyncListener.disable();
    asyncListenerMap.delete(id);
};

/*
 *
 * CONSTANTS
 *
 */
const CONTEXTS_SYMBOL = 'cls@contexts';
const ERROR_SYMBOL = 'error@context';

class Namespace {

    constructor(name) {

        this.name   = name;
        // changed in 2.7: no default context
        this.active = null;
        this._set   = [];
        this.id     = null;
    }

    set(key, value) {

        if (!this.active) {
            throw new Error('No context available. ns.run() or ns.bind() must be called first.');
        }

        if (key === 'req') {
            addRecord(value, AsyncHooks.executionAsyncId());
            addActive(value, this.active);
        }

        this.active[key] = value;
        return value;
    }

    get(key) {

        if (!this.active) {
            return undefined;
        }

        return this.active[key];
    }

    createContext() {

        return Object.create(this.active);
    }

    run(fn) {

        const context = this.createContext();
        this.enter(context);
        try {
            fn(context);
            return context;
        }
        catch (exception) {
            if (exception) {
                exception[ERROR_SYMBOL] = context;
            }
            throw exception;
        }
        finally {
            this.exit(context);
        }
    }

    runAndReturn(fn) {

        let value;
        this.run((context) => {

            value = fn(context);
        });
        return value;
    }

    bind(fn, context) {

        if (!context) {
            if (!this.active) {
                context = this.createContext();
            }
            else {
                context = this.active;
            }
        }

        const self = this;
        return function () {

            self.enter(context);
            try {
                return fn.apply(this, arguments);
            }
            catch (exception) {
                if (exception) {
                    exception[ERROR_SYMBOL] = context;
                }
                throw exception;
            }
            finally {
                self.exit(context);
            }
        };
    }

    enter(context) {

        Assert.ok(context, 'context must be provided for entering');

        this._set.push(this.active);
        this.active = context;
    }

    exit(context) {

        Assert.ok(context, 'context must be provided for exiting');

        // Fast path for most exits that are at the top of the stack
        if (this.active === context) {
            Assert.ok(this._set.length, 'can\'t remove top context');
            this.active = this._set.pop();
            return;
        }

        // Fast search in the stack using lastIndexOf
        const index = this._set.lastIndexOf(context);

        if (index > 0) {
            this._set.splice(index, 1);
        }
    }

    bindEmitter(emitter) {

        Assert.ok(emitter.on && emitter.addListener && emitter.emit, 'can only bind real EEs');

        const namespace = this; // eslint-disable-line
        const thisSymbol = 'context@' + this.name;

        // Capture the context active at the time the emitter is bound.
        const attach = function (listener) {

            if (!listener) {
                return;
            }
            if (!listener[CONTEXTS_SYMBOL]) {
                listener[CONTEXTS_SYMBOL] = Object.create(null);
            }


            listener[CONTEXTS_SYMBOL][thisSymbol] = {
                namespace,
                context: namespace.active
            };
        };

        // At emit time, bind the listener within the correct context.
        const bind = function (unwrapped) {

            if (!(unwrapped && unwrapped[CONTEXTS_SYMBOL])) {
                return unwrapped;
            }

            let wrapped  = unwrapped;
            const contexts = unwrapped[CONTEXTS_SYMBOL];
            Object.keys(contexts).forEach((name) => {

                const thunk = contexts[name];
                wrapped = thunk.namespace.bind(wrapped, thunk.context);
            });
            return wrapped;
        };

        WrapEmitter(emitter, attach, bind);
    }

    /**
     * If an error comes out of a namespace, it will have a context attached to it.
     * This function knows how to find it.
     *
     * @param {Error} exception Possibly annotated error.
     */
    fromException(exception) {

        return exception[ERROR_SYMBOL];
    }
}

const getNamespace = function (name) {

    return process.sqreen_namespaces[name];
};

const createNamespace = function (name) {

    Assert.ok(name, 'namespace must be given a name!');

    const namespace = new Namespace(name);
    namespace.id = addAsyncListener({
        create : function () {

            return namespace.active;
        },
        before : function (context, storage) {

            if (storage) {
                namespace.enter(storage);
            }
        },
        after  : function (context, storage) {

            if (storage) {
                namespace.exit(storage);
            }
        },
        error  : function (storage) {

            if (storage) {
                namespace.exit(storage);
            }
        }
    });

    process.sqreen_namespaces[name] = namespace;
    return namespace;
};

const destroyNamespace = function (name) {

    const namespace = getNamespace(name);

    Assert.ok(namespace, 'can\'t delete nonexistent namespace!');
    Assert.ok(namespace.id, 'don\'t assign to process.sqreen_namespaces directly!');

    removeAsyncListener(namespace.id);
    process.sqreen_namespaces[name] = null;
};

const reset = function () {

    // must unregister async listeners
    if (process.sqreen_namespaces) {
        Object.keys(process.sqreen_namespaces).forEach((name) => {

            destroyNamespace(name);
        });
    }
    process.sqreen_namespaces = Object.create(null);
};

if (!process.sqreen_namespaces) { // call immediately to set up
    reset();
}

const getMap = function () {

    return asyncListenerMap;
};

module.exports = {
    getNamespace,
    createNamespace,
    destroyNamespace,
    reset,
    addAsyncListener,
    removeAsyncListener,
    getMap
};
//$lab:coverage:on$
