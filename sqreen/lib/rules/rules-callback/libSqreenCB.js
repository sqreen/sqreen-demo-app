'use strict';
const VM = require('vm');

const UUID = require('uuid');
const Logger = require('../../logger');
const Builder = require('./callbackBuilder');
const Utils = require('./utils');
const InstrumentationUtils = require('../../instrumentation/utils');
let LibSqreen;

const DEFAULT_MAX_TIMEOUT = 5; // ms

const getBaAndTransformerName = module.exports.getBaAndTransformerName = function (key) {

    const pipePos = key.lastIndexOf('|');
    if (pipePos === -1) {
        return { ba: key, transformer: '', key };
    }
    return { ba: key.slice(0, pipePos).trim(), transformer: key.slice(pipePos + 1).trim(), key };
};

//$lab:coverage:off$
let first = true;
module.exports.getCbs = function (rule) {

    try {
        LibSqreen = require('sq-native');
    }
    catch (e) {
        if (first) {
            Logger.DEBUG('Sqreen could not load package `sq-native`. In-app WAF features will not be available.');
            const Message = require('../../agent_message');
            const Os = require('os');
            const infos = {
                platform: Os.platform(),
                arch: Os.arch(),
                node: process.version
            };
            const msg = 'Sqreen could not load package `sq-native`.\nIn-app WAF features will not be available.\nMessage: ' + e.message;
            (new Message(Message.KIND.no_sq_native, msg, infos))
                .report()
                .catch(() => {});
        }
        first = false;
        throw e;
    }

    // check rule is properly formed
    const opt = rule.data.values;
    const max_budget = opt.max_budget_ms || DEFAULT_MAX_TIMEOUT;
    const binding_accessors = opt.binding_accessors // we split bas and their transformers to resolve separately
        .map((x) => {

            if (typeof x === 'string') {
                return getBaAndTransformerName(x);
            }
            const res = getBaAndTransformerName(x.ba);
            res.default = x.default;
            return res;
        });

    const waf_rules = opt.waf_rules;
    const inst = new LibSqreen(UUID.v4(), waf_rules);

    const run = function (args, value, _, selfObject, session) {

        const req = session.req;
        if (!req) {
            return null;
        }
        const params = {};
        const cache = new Map();
        for (let i = 0; i < binding_accessors.length; ++i) {
            const ba = binding_accessors[i].ba;
            const baKey = binding_accessors[i].key;
            const def = binding_accessors[i].default;
            const transformer = binding_accessors[i].transformer;

            const inCache = cache.has(ba); // cache, just in case
            let res;
            if (inCache === true) {
                res = cache.get(ba);
            }
            else {
                try {
                    res = Builder.bindThis.apply({ data: {} }, [ba, {}, {}, {}, req, req]);
                }
                catch (__) {}
                if (res === null || res === undefined) {
                    res = def;
                }
                cache.set(ba, res);
            }
            if (res !== null && res !== undefined) { // no else, we will not bind empty things
                /**
                 * We need to:
                 * * apply the transformer
                 * * sanitize the object
                 */
                if (transformer !== 'flat_keys' && transformer !== 'flat_values') {
                    const t = Builder.transformers[transformer];
                    if (t !== undefined) {
                        params[baKey] = t(res);
                    }
                }
                if (transformer === 'flat_keys') {
                    params[baKey] = Utils.flat_keys(res, 0);
                }
                else if (transformer === 'flat_values') {
                    params[baKey] = Utils.flat_values(res, 0);
                }
                else {
                    params[baKey] = Utils.limitObject(res, 0);
                }
            }
        }

        return params;
    };

    const sandbox = { run, result: null };
    const context = VM.createContext(sandbox);
    const Script = new VM.Script('result = run(args, value, _, selfObject, session, timeout);');

    return {
        pre: function (args, value, _, selfObject, session, timeout) { // todo: runInContext

            // timeout is always a number and can ba Infinity - see patch.js

            const tStart = process.hrtime();
            let params;
            timeout = Math.max(timeout, 1); // we need at least 1 ms
            if (timeout !== Infinity) {

                sandbox.args = args;
                sandbox.value = value;
                sandbox._ = _;
                sandbox.selfObject = selfObject;
                sandbox.session = session;
                sandbox.timeout = timeout;
                try {
                    Script.runInContext(context, { timeout: Math.ceil(timeout) }); // this only accepts integers in ms
                }
                catch (err) {
                    if (!err){
                        throw new Error('empty err');
                    }
                    if (err.message && err.message.indexOf('Script execution timed out') > -1) {
                        return null;
                    }
                    throw err;
                }

                params = sandbox.result;
            } // we have a timeout, no need to run in context
            else {
                params = run(args, value, _, selfObject, session, timeout);
            }

            if (params === null) { // this is a timeout situation
                return null;
            }

            const tSpent = process.hrtime(tStart);
            const spentTime = InstrumentationUtils.mergeHrtime(tSpent);
            timeout = timeout  - spentTime;

            if (timeout <= 0)  {
                return null;
            }

            timeout = Math.min(timeout, max_budget);
            const res = inst.run(params, timeout * 1000); // microsecond

            if (rule.block !== true) {
                res.status = null;
            }

            return res;
        }
    };
};

module.exports.clearAll = function () {

    try {
        require('sq-native').clearAll();
        return true;
    }
    catch (e) {
        return false;
    }
};
//$lab:coverage:on$
