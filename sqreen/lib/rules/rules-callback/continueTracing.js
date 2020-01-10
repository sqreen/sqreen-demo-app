/**
 * Copyright (c) 2016 - 2020 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const isEmitter = require('../../instrumentation/hooks/tracingHook').isEmitter;

const ContinueTracingCB = class {

    constructor(rule) {

        this.toBind = (rule && rule.data && rule.data.values && rule.data.values[0] && rule.data.values[0].bindRanks) || null;
        const self = this;
        this.pre = function (args, value, _, selfObject, session) {

            return self.bindArgs(args, session);
        };

        this.post = function (arg, value, _, selfObject, session) {

            if (value && isEmitter(value)) {
                session.raw.bindEmitter(value);
            }
        };
    }

    bindArgs(args, session) {

        if (!session || !session.raw || !session.raw.bind) {
            return;
        }

        let length;
        let getRank;
        if (this.toBind) {
            length = this.toBind.length;
            getRank = (i) => this.toBind[i];
        }
        else {
            length = args.length;
            getRank = (i) => i;
        }

        for (let i = 0; i < length; ++i) {
            const rank = getRank(i);
            if (typeof args[rank] === 'function') {
                args[rank] = session.raw.bind(args[rank]);
            }
        }
    }
};


module.exports.getCbs = function (rule) {

    return new ContinueTracingCB(rule);
};
