/**
 * Copyright (c) 2016 - 2020 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
// @ts-check
'use strict';

/**
 * @typedef {import('./reveal').InputRequest} InputRequest
 * @typedef {import('./reveal').RunStats} RunStats
 *
 * @typedef {{
 *   signal_name: string;
 *   payload: Record<string, any>;
 *   payload_schema: string;
 *   batch: () => void;
 *   report: () => Promise<object>;
 * }} Point
 */
const SqreenSDK = require('sqreen-sdk');

// $lab:coverage:off$
/**
 * Send a Reveal InputRequest signal.
 *
 * @param {InputRequest} request - An InputRequest object.
 */
module.exports.recordMutatedRequest = (request) => {

    /** @type Point */
    const point = new SqreenSDK.Point('sq.agent.reveal.inputrequest', 'sqreen:agent:reveal');
    point.payload = request;
    point.payload_schema = 'inputrequest/2019-11-28T15:34:25.000Z';
    point.batch();
};

/**
 * Send a Reveal RunStats signal.
 *
 * @param {RunStats} stats - A RunStats object.
 * @returns {Promise<object>}
 */
module.exports.recordStats = (stats) => {

    /** @type Point */
    const point = new SqreenSDK.Point('sq.agent.reveal.runstats', 'sqreen:agent:reveal');
    point.payload = stats;
    point.payload_schema = 'runstats/2020-03-09T15:09:32.000Z';
    return point.report();
};
// $lab:coverage:on$
