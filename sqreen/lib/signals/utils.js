/**
 * Copyright (c) 2016 - 2019 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const SqreenSDK = require('sqreen-sdk');

const report = (b) => require('../backend').signal_batch(require('../agent').SESSION_ID(), b);
//$lab:coverage:off$
const singleReport = function () {

    return report([this]);
};
//$lab:coverage:on$

SqreenSDK.initBatch(100, 60, report);
SqreenSDK.setReport(singleReport);

const VERSION = require('../../version').version;
const Os = require('os');
const os_type = Os.arch() + '-' + Os.type();
const hostname = Os.hostname();
module.exports.infra = {
    agent_type: 'nodejs',
    agent_version: VERSION,
    os_type,
    hostname,
    runtime_type: 'node',
    runtime_version: process.version
};

module.exports.SIGNAL_AGENT_VERSION = `sqreen:agent:${VERSION}`;

module.exports.PAYLOAD_SCHEMA = {
    ATTACK: 'attack/2020-01-01T00:00:00.000Z',
    EXCEPTIONS: 'exception/2020-01-01T00:00:00.000Z',
    SDK_TRACK: 'track_event/2020-01-01T00:00:00.000Z',
    METRIC: 'metric/2020-01-01T00:00:00.000Z',
    BINNING_METRIC: 'metric_binning/2020-01-01T00:00:00.000Z',
    AGENT_MESSAGE: 'agent_message/2020-01-01T00:00:00.000Z'
};
