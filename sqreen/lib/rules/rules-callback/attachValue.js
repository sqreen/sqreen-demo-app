/**
 * Copyright (c) 2016 - 2019 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';

/**
 * attach the return value somewhere in the request object
 * @author vdeturckheim
 * @framework none
 * @target *
 * @returns {{post: post}}
 */
module.exports.getCbs = function () {

    return {
        post: function (args, value, rule, selfObj, session) {

            if (!session.req) {
                return;
            }
            const claim = rule.data.values[0].claim;
            const name = rule.data.values[0].name;

            session.req.__sqreen = session.req.__sqreen || {};
            session.req.__sqreen[claim] = session.req.__sqreen[claim] || [];
            session.req.__sqreen[claim].push({ name, value });
        }
    };
};
