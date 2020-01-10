/**
 * Copyright (c) 2016 - 2020 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const BUFFER_MAX_SIZE = 10000;

const Metric = require('./index');
const Backend = require('../backend');
const Agent = require('../agent');

let buffer = [];

module.exports.report = function (force) {

    if (Agent.STARTED() && Agent.SESSION_ID()) {

        const payload = (Metric.getAllReports(force) || []).concat(buffer);
        buffer = [];
        if (payload.length > 0) {

            return Backend.metrics(Agent.SESSION_ID(), { metrics: payload })
                .catch(() => {

                    buffer = payload.slice(-1 * BUFFER_MAX_SIZE); // drop oldest metrics
                });
        }
    }
    return Promise.resolve();
};
