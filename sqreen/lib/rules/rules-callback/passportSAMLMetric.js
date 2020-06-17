/**
 * Copyright (c) 2016 - 2020 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const Feature = require('../../command/features');

const Fuzzer = require('../../fuzzer');
const LOGIN = require('../../enums/metrics').LOGIN;
const Util = require('../../util');
const RuleUtil = require('./utils');
const Logger = require('../../logger');

module.exports.getCbs = function () {

    const pre = function (args, value, rule, selfObject, session) {

        const req = session && session.req;
        const ip = req &&  Util.getXFFOrRemoteAddress(req) || '';

        Logger.INFO(`Sqreen login: has session: ${!!req}`);

        const done = args[args.length - 1];
        args[args.length - 1] = function (authErr, user, info) {

            const now = new Date();

            setImmediate(() => {

                const obj = RuleUtil.findLoginArtifact(user);
                const fieldName = obj.key;
                const userName = obj.value;
                if (fieldName && userName) {

                    const keys = [[fieldName, userName]];
                    let key;
                    // $lab:coverage:off$
                    if (Fuzzer.hasFuzzer() && Fuzzer.isRequestReplayed(req)) {
                        const reveal = {
                            session_id: Fuzzer.getSessionID(req)
                        };
                        key = JSON.stringify({ keys, ip, reveal });
                        // $lab:coverage:on$
                    }
                    else {
                        key = JSON.stringify({ keys, ip });
                    }

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
