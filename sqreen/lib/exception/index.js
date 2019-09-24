/**
 * Copyright (c) 2016 - 2019 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const Logger = require('../logger');
const EVENT = require('../enums/events');
const EventQueue = require('../events');
const Util = require('util');
/**
 * report an exception and return it in a rejected promise
 * @param err
 * @returns {*}
 */
module.exports.report = function (err) {

    return new Promise((resolve, reject) => {

        setImmediate(() => {

            err = err || '';

            if (err.reported) {
                return reject(err);
            }

            if (!(err.stack)){

                err = new Error(Util.inspect(err));
            }

            err.reported = true;
            Logger.DEBUG(`Sqreen reports error ${err}`);

            // TODO: make better when diverses features appears
            const payload = {
                klass: Error.name,
                message: err.message,
                params: null,
                time: null,
                infos: {
                    client_ip: null,
                    args: err.args
                },
                request: null,
                rule_name: err.ruleName || null,
                rulespack_id: err.rulesPack || null,
                context: {
                    backtrace: err.stack.split('\n')
                }
            };

            return EventQueue.writeEvent(EVENT.TYPE.ERROR, payload)
                .then(() => reject(err));
        });
    });
};

