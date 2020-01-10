/**
 * Copyright (c) 2016 - 2020 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const Assert = require('assert');
const Hoek = require('../../../vendor/hoek/lib/index');
const Precondition = require('../../instrumentation/preConditions');
const Dpoint = require('../../data_point');

const SIGNATURE_VERSION = 'v0_9';

const Unique = class {

    constructor() {

        this.data = [];
    }

    has(item) {

        for (let i = 0; i < this.data.length; ++i) {
            const val = this.data[i];
            if (val === item || Hoek.deepEqual(val, item) === true) {
                return true;
            }
        }
        return false;
    }

    add(item) {

        return this.data.push(item);
    }
};

const unique = new Unique();

module.exports.getCbs = function (rule) {

    Assert(rule.signature[SIGNATURE_VERSION].keys.indexOf('data') > -1);

    const values = rule.data.values[0].collect;
    const type = rule.data.values[0].type;
    const binder = new Precondition.Binder(rule.data);

    return {
        pre: function (args, value, _, selfObject, session) {

            const req = session.req;

            if (rule.data.values[0].unique) {
                const item = binder.bindThis(rule.data.values[0].unique, args, value, selfObject, req);
                if (unique.has(item)) {
                    return null;
                }
                if (item !== null) {
                    unique.add(item);
                }
            }

            const data = values.map((x) => {

                try {
                    const val = Precondition.evalPreCond(x.ba, binder, args, value, selfObject, req);
                    return {
                        key: x.key,
                        value:  typeof val === 'boolean' ? val : (val || '')
                    };
                }
                catch (e) {
                    return {};
                }
            });

            Dpoint.write(rule, { data, type });
            return null;
        }
    };
};
