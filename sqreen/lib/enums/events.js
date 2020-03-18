/**
 * Copyright (c) 2016 - 2020 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
/**
 * Known Sqreen event types
 */
module.exports.TYPE = {
    ERROR: 'ERROR',
    ATTACK: 'ATTACK',
    REQUEST_RECORD: 'request_record',
    SDK_TRACK: 'sdk_track',
    AGENT_MESSAGE: 'agent_message',
    DATA_POINT: 'data_point',
    SIGNAL_LOG: 'signal_log',
    SIGNAL_METRIC: 'signal_metric',
    SIGNAL_TRACE: 'signal_trace'
};

module.exports.OTHER_TYPES = {
    METRIC: 'metric',
    BUNDLE: 'bundle',
    LOGIN: 'login',
    HEART_BEAT: 'beat'
};
