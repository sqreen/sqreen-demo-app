/**
 * Copyright (c) 2016 - 2019 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const Runner = require('./../runner');
const Hoek = require('hoek');
const Exception = require('../../exception/index');
const Logger = require('../../logger');
const AsJson = require('./utils').asJson;
const Util = require('./utils'); // TODO: explain this to CTO
const MainUtils = require('../../util');
const Flat = require('flat');
const Collector = require('../../conf_collector/index.js');

const Vm = require('vm');

const reach = function (object, path) {

    for (let i = 0; i < path.length; ++i) {
        object = object[path[i]];
    }
    return object;
};

const getCleanSession = function (session) {

    session = session || {};
    if (!session._clean) {
        session = AsJson(Util.getLookableClaims(session.req));
        session._clean = true;
    }
    return session;
};

const _delimiter = '_._';
const transformers = {
    parse_url: Collector.readURL,
    grade_password: Collector.readPassword,
    flat_keys: function (value) {

        value = AsJson(value);

        if (typeof value !== 'object') {
            return [value];
        }

        const flat = Flat(value, { delimiter: _delimiter, maxDepth: 10 });
        const keys = Object.keys(flat);
        let result = [];

        for (let i = 0; i < keys.length; ++i) {
            result = result.concat(keys[i].split(_delimiter));
        }

        return result;
    },
    flat_values: function (value) {

        value = AsJson(value);

        if (typeof value !== 'object') {
            return [value];
        }

        const flat = Flat(value, { maxDepth: 10 });
        const keys = Object.keys(flat);
        const result = [];
        for (let i = 0; i < keys.length; ++i) {
            result.push(flat[keys[i]]);
        }

        return result;
    }
};

const getTransformer = function (key) {

    const pipePos = key.lastIndexOf('|');
    const candidateName = key.slice(pipePos + 1).trim();
    if (transformers[candidateName] !== undefined) {

        return {
            transform: transformers[candidateName],
            baseKey: key.slice(0, pipePos)
        };
    }
    return {
        transform: (x) => x,
        baseKey: key
    };
};

const Run = class {

    constructor(cb, methods, rule) {

        this.cb = cb;
        this.methods = methods;
        this.rule = rule || {};
        const self = this;

        const fct = cb.slice(-1);
        this.context = Runner.getExecContext(fct);
        this.script = Vm.createScript('var result = ruleFct.apply(selfObject, params);'); // TODO: remove apply someday for perf gain

        this.method = function (args, value, _, selfObj, session, timeout) {

            return self.action(args, value, selfObj, session, timeout);
        };
        this.params = cb.slice(0, -1);
        this.data = this.rule.data || {};
    }

    run(params, selfObject, timeout) {

        try {
            this.context.params = params;
            this.context.selfObject = selfObject || {};
            if (timeout === Infinity || timeout === undefined) {
                this.script.runInContext(this.context);
            }
            else {
                timeout = Math.max(Math.floor(timeout), 1); // VM refuses timeouts under 1
                this.script.runInContext(this.context, { timeout });
            }


            return this.context.result;
        }
        catch (er) {

            let err = er;
            if (err === null || err === undefined) {
                err = new Error('Unknown error: ' + err);
            }

            if (err.message && err.message.indexOf('Script execution timed out') === 0) {
                Logger.INFO(`Rule ${this.rule.name} timed out`);
                return null; // ignore if the exception has been thrown becaise of a js callback timeout
            }


            if (!err.stack) {
                err = new Error(err);
            }
            err.args = params;
            throw err;
        }
        finally {

            this.context.params = null;
            this.context.selfObject = null;
            this.context.result = null;
        }
    }

    bindThis(key, args, value, selfObj, session, req) {

        session = session || {};

        const masterItem = (key.match(/(#.\w+)/g) || [])[0];

        if (masterItem) {
            // we need to bind with sqreen variables
            if (key === '#.caller') {
                return (new Error()).stack.split('Error\n').pop();
            }

            const request_params = {};
            const filtered_request_params = {};
            const sqreenMatches = { // TODO: lazy creation
                '#.data': () => this.data,
                '#.rv': () => value,
                '#.args': () => args,
                '#.inst': () => selfObj,
                '#.sess': () => session,
                '#.req': () => req, // this is a dangerous BA that will only work for express. // TODO: find a better way
                '#.params': () => session,
                '#.client_ip': () => MainUtils.getXFFOrRemoteAddress(session),
                '#.cwd': () => process.cwd(),
                '#.request_params': () => {

                    request_params.body = session.body;
                    request_params.query = session.query;
                    request_params.headers = session.headers;
                    request_params.cookies = session.cookies;
                    request_params.url = session.url;
                    request_params.params = session.params;
                    return request_params;
                },
                '#.filtered_request_params': () => {

                    filtered_request_params.body = session.body;
                    filtered_request_params.query = session.query;
                    filtered_request_params.params = session.params;
                    return filtered_request_params;
                }
            };
            if (session.__sqreen_lookup && session.__sqreen_lookup.hapi) {
                request_params.hapi = {
                    query: session.__sqreen_lookup.hapi.query,
                    payload: session.__sqreen_lookup.hapi.payload,
                    state: session.__sqreen_lookup.hapi.state,
                    params: session.__sqreen_lookup.hapi.params
                };

                filtered_request_params.hapi = {
                    query: session.__sqreen_lookup.hapi.query,
                    payload: session.__sqreen_lookup.hapi.payload,
                    params: session.__sqreen_lookup.hapi.params
                };
                // session is supposed to be a clean clone here
                session.cookies = session.cookies || {};
                Object.assign(session.cookies, session.__sqreen_lookup.hapi.state);
            }

            if (masterItem in sqreenMatches) {

                const transformer = getTransformer(key);

                key = transformer.baseKey;

                if (masterItem === key) {
                    return transformer.transform(sqreenMatches[masterItem]());
                }

                const splitted = key.split(masterItem);
                const end = splitted[1];

                let match = end.match(/\['([\w|-]+)']|\[(\d+)]/g);
                if (!match) {
                    return transformer.transform(sqreenMatches[masterItem]());
                }

                match = match.map((item) => item.replace('[\'', '').replace('\']', '').replace('[', '').replace(']', ''));

                return transformer.transform(reach(sqreenMatches[masterItem](), match));

            }
            // unknown key
            return null;
        }

        // string
        const match = key.match(/'(.*)'/);
        if (match) {
            return match[1];
        }
        // integer
        const asInt = parseInt(key);
        if (isFinite(asInt)) {
            return asInt;
        }
        // somkething else ?
        return null; // useless but expressive
    }

    bindAccessors(args, value, selfObj, session, req) {

        const params = this.params;
        const length = params.length;
        const argumentsToPass = new Array(length);

        for (let i = 0; i < length; ++i) {
            argumentsToPass[i] = this.bindThis(params[i], args, value, selfObj, session, req);
        }

        return argumentsToPass;
    }

    action(args, value, selfObj, session, timeout) {

        const req = session && session.req;
        session = getCleanSession(session);

        args = args || [];

        const params = this.bindAccessors(args, value, selfObj, session, req);

        const result = this.run(params, selfObj, timeout); // yes, those methods can change the values of the arguments passed to the instrumented methods

        if (result) {
            if (result.call) { // result must not be a function, the first who returns a fct from a cb will have to offer me cookies everyday for the end of my life
                Hoek.assert(!!this.methods[result.call], `method ${result.call} is unknown in the context of rule: ${this.rule.title}`);

                const newArgs = result.args || args;
                value = result.data || value;// as in in https://github.com/sqreen/AgentRuby/blob/master/lib/sqreen/rules_callbacks/execjs.rb#L99
                return this.methods[result.call](newArgs, value, this.rule, selfObj, session);
            }
            if ( !this.rule.block && typeof result === 'object') {
                result.status = null;
            }
        }

        return result;
    }
};
const build = module.exports._build = function (cb, methods, rule) {

    return (new Run(cb, methods, rule)).method;
};

module.exports.getCbs = function (rule) {

    Hoek.assert(!!rule.callbacks, `no callbacks in rule ${rule}`);

    const callbacks = rule.callbacks.nodejs || rule.callbacks;
    const methodNames = Object.keys(callbacks);
    const methods = {};
    for (let i = 0; i < methodNames.length; ++i) {
        const name = methodNames[i];
        try {
            methods[name] = build(callbacks[name], methods, rule);
        }
        catch (err) {
            Logger.DEBUG(`could not compile callback ${name} in ${rule.title}`);
            Exception.report(new Error(`could not compile callback ${name} in ${rule.name}/${rule.title}: ${err.message}`)).catch(() => {});
            return null; // we cannot do anything with this rule anymore !
        }
    }

    const result = {};

    result.pre = methods.pre;
    result.post = methods.post;
    result.fail = methods.fail;
    result.async_post = methods.async_post;

    if (rule.data !== undefined && rule.data.values !== undefined && rule.data.values[0] !== undefined && rule.data.values[0].no_budget === true) {
        Object.keys(result)
            .map((x) => result[x])
            .filter(Boolean)
            .forEach((method) => {

                method.noBudget = true;
            });
    }

    return result;
};

module.exports._bindThis = function (key, cb, args, value, rule, selfObj, session) {

    cb && cb.pop();
    const params = cb;
    const data = rule ? rule.data : {};
    return Run.prototype.bindThis.apply({ rule, cb, params, data }, [key, args, value, selfObj, session]);
};

module.exports.getCleanSession = getCleanSession;
module.exports.bindThis = Run.prototype.bindThis;

module.exports._bindAccessors = function (cb, args, value, rule, selfObj, session, req) {

    const params = cb.slice(0);
    params.pop();
    return Run.prototype.bindAccessors.apply({ cb, rule, params,
        bindThis: function () {

            return Run.prototype.bindThis.apply(this, arguments);
        }
    }, [args, value, selfObj, session, req]);
};
