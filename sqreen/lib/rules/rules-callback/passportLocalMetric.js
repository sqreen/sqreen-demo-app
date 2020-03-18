/**
 * Copyright (c) 2016 - 2020 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const Feature = require('../../command/features');

const LOGIN = require('../../enums/metrics').LOGIN;
const Util = require('../../util');
const Logger = require('../../logger');

module.exports.getCbs = function () {

    const pre = function (args, value, rule, selfObject, session) {

        Logger.INFO(`Sqreen login: has session: ${!!(session && session.req)}`);

        const userNameRank = selfObject && selfObject._passReqToCallback ? 1 : 0; // or Number(Boolean(sel...))

        const fieldName = selfObject && selfObject._usernameField || 'username';
        const ip = session && session.req &&  Util.getXFFOrRemoteAddress(session.req) || '';

        const userName = args[userNameRank];
        const done = args[args.length - 1];
        args[args.length - 1] = function (authErr, user, info) {

            const now = new Date();
            const key = JSON.stringify( { keys: [[fieldName, userName]], ip }); // TODO: finx integ tests here
            if (authErr || !user) {
                // login fail
                setImmediate(() => {

                    Feature.getMetrics().addObservations([[LOGIN.FAIL, key, 1]], now);
                });
            }
            else {
                // login success
                setImmediate(() => {

                    Feature.getMetrics().addObservations([[LOGIN.SUCCESS, key, 1]], now);
                });
            }
            done.apply(this, arguments);
        };
    };

    pre.noBudget = true;

    return {
        pre
    };
};
