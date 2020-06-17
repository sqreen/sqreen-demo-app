/**
 * Copyright (c) 2016 - 2020 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
module.exports = {
    LOGIN: {
        FAIL: 'auto-login-fail',
        SUCCESS: 'auto-login-success',
        SDK_FAIL: 'sdk-login-fail',
        SDK_SUCCESS: 'sdk-login-success'
    },
    PERF: {
        SQREEN_CALL_COUNTS: 'sqreen_call_counts',
        WHITELISTED: 'whitelisted',
        REQUEST_OVERTIME: 'request_overbudget_cb',
        MONIT_REQUEST_OVERTIME: 'monitoring_request_overbudget_cb',
        PCT: 'pct',
        REQ: 'req',
        SQ: 'sq',
        SQ_PREFIX: 'sq.',
        SQ_MONIT_PREFIX: 'sq.'
    },
    HEALTH: {
        SYSTEM_LOAD_1: 'health.load.1',
        SYSTEM_LOAD_5: 'health.load.5',
        SYSTEM_LOAD_15: 'health.load.15',
        PROCESS_TOTAL_HEAP_SIZE: 'health.heap.total',
        PROCESS_USED_HEAP_SIZE: 'health.heap.used',
        PROCESS_HEAP_SIZE_LIMIT: 'health.heap.limit'
    },
    KIND: {
        SUM: 'Sum',
        AVERAGE: 'Average',
        COLLECT: 'Collect',
        BINNING: 'Binning'

    }
};
