'use strict';
const UUID = require('uuid');
const Logger = require('../../logger');
const Builder = require('./callbackBuilder');
let LibSqreen;

// On windows, we don't run this for now
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
    const binding_accessors = opt.binding_accessors;
    const waf_rules = opt.waf_rules;
    LibSqreen.clearAll();
    const inst = new LibSqreen(UUID.v4(), waf_rules);

    return {
        pre: function (args, value, _, selfObject, session, timeout) {

            const req = session.req;
            if (!req) {
                return null;
            }
            const params = {};
            for (let i = 0; i < binding_accessors.length; ++i) {
                const ba = binding_accessors[i];
                params[ba] = Builder.bindThis.apply({ data: {} }, [ba, {}, {}, {}, req, req]);
            }

            if (timeout === Infinity) {
                timeout = 2; // ms
            }
            const res = inst.run(params, timeout * 1000); // microsecond

            if (rule.block !== true) {
                res.status = null;
            }

            return res;
        }
    };
};
//$lab:coverage:on$