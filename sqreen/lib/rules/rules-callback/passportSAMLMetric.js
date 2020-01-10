/**
 * Copyright (c) 2016 - 2020 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const Metric = require('../../metric');

const LOGIN = require('../../enums/metrics').LOGIN;
const Util = require('../../util');
const RuleUtil = require('./utils');
const Logger = require('../../logger');

module.exports.getCbs = function () {

    const pre = function (args, value, rule, selfObject, session) {

        Logger.INFO(`Sqreen login: has session: ${!!(session && session.req)}`);

        const ip = session && session.req &&  Util.getXFFOrRemoteAddress(session.req) || '';

        const done = args[args.length - 1];
        args[args.length - 1] = function (authErr, user, info) {

            const now = new Date();

            setImmediate(() => {

                const obj = RuleUtil.findLoginArtifact(user);
                const fieldName = obj.key;
                const userName = obj.value;
                if (fieldName && userName) {
                    if (authErr || !user) {
                        // login fail
                        const key = JSON.stringify({ keys: [[fieldName, userName]], ip });
                        setImmediate(() => {

                            Metric.addObservations([[LOGIN.FAIL, key, 1]], now);
                        });
                    }
                    else {
                        // login success
                        const key = JSON.stringify({ keys: [[fieldName, userName]], ip });
                        setImmediate(() => {

                            Metric.addObservations([[LOGIN.SUCCESS, key, 1]], now);
                        });
                    }
                }
            });
            done.apply(this, arguments);
        };
    };

    pre.noBudget = true;

    return {
        pre
    };
};
