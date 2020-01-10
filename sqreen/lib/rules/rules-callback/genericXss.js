/**
 * Copyright (c) 2016 - 2020 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const Act = require('../../instrumentation/patch')._actOnCbResult;
const Vm = require('vm');

const sanitize = module.exports._sanitize = function (obj, excl) {

    excl = excl || ['settings', '_locals', 'cache'];

    const keys = Object.keys(obj);
    for (let i = 0; i < keys.length; ++i) {
        if (excl.indexOf(keys[i]) > -1) {
            continue;
        }
        if (typeof obj[keys[i]] === 'string') {
            obj[keys[i]] = '__';
        }
        if (typeof obj[keys[i]] === 'object') {
            sanitize(obj[keys[i]]);
        }
    }
};

module.exports.getCbs = function (_rule) {

    const context = Vm.createContext({ result: null, fct: null });
    Vm.runInContext(`fct = ${_rule.callbacks.pre[2]}`, context);

    return {
        pre: function (args, value, rule, selfObject, session) {

            if (typeof args[1] ===  'function') {

                const orig = args[1];
                const options = args[0];
                args[1] = function (err, rendered) {

                    orig.apply(this, arguments);

                    if (!err) {

                        const sanitized = Object.assign({}, options);
                        sanitize(sanitized);

                        selfObject.render.__original.call(selfObject, sanitized, (err, baseline) => {

                            if (!err) {
                                context.baseline = baseline;
                                context.rendered = rendered;
                                Vm.runInContext('result = fct(baseline, rendered)', context);
                                const xss = context.result;
                                if (xss) {
                                    const payload = `<${xss.name} ${Object.keys(xss.attribs).map((key) => key + '="' + xss.attribs[key] + '"').join(' ')}></${xss.name}>`;
                                    Act([{ record: { found: xss.name, payload }, rule, session }], session);
                                }
                            }
                        });
                    }
                };

            }
            return null;
        }
    };
};
