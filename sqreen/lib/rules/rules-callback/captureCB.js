/**
 * Copyright (c) 2016 - 2020 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const Precondition = require('../../instrumentation/preConditions');

// FIXME: I should be a class

module.exports.getCbs = function (rule) {

    const values = rule.data.values[0].capture;
    const binder = new Precondition.Binder(rule.data);

    return {
        pre: function (args, value, _, selfObject, session) {

            const req = session.req;

            const result = {};
            for (let i = 0; i < values.length; ++i) {
                const x = values[i];
                try {
                    result[x.as] = Precondition.evalPreCond(x.ba, binder, args, value, selfObject, req);
                }
                catch (e) {
                    result[x.as] = ''; // TODO: clarify what this should do
                }
            }

            return {
                data_points: [result]
            };
        }
    };
};
