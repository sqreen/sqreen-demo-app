/**
 * Copyright (c) 2016 - 2019 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const bindThis = require('./callbackBuilder').bindThis;

const Binder = class {

    constructor(data) {

        this.data = data;
    }
};
Binder.prototype.bindThis = bindThis;

// http['']['']['OutgoingMessage.prototype:end'][0]
module.exports.getCbs = function (rule) {

    if (rule.metrics.length === 0 || rule.data.values.length === 0) {
        return {};
    }

    const values = rule.data.values;
    const binder = new Binder(rule.data);
    const METRIC_NAME = rule.metrics[0].name;

    return {
        pre: function (args, value, _, selfObject, session) {

            const req = session.req;

            const result = values.map((x) => binder.bindThis(x, args, value, selfObject, req));

            return { observations: [[METRIC_NAME, JSON.stringify(result), 1]] };
        }
    };
};
