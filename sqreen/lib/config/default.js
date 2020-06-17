/**
 * Copyright (c) 2016 - 2020 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';

const Logger = require('../logger');

module.exports = {
    url: 'https://back.sqreen.io',
    ingestion_url: 'https://ingestion.sqreen.com',
    rules_verify_signature: true,
    log_level: Logger.logLevels.WARN,
    log_location: '',
    run_in_test: false,
    block_all_rules: false,
    report_perf_newrelic: false,
    config_file: '',
    initial_features: '',
    http_proxy: '',
    ip_header: '',
    strip_sensitive_data: true,
    app_root: process.cwd(),
    strip_sensitive_keys: ['password', 'secret', 'passwd', 'authorization', 'api_key', 'apikey', 'access_token'],
    strip_sentitive_regex: [/^(?:\d[ -]*?){13,16}$/],
    heartbeat_delay: 0,
    use_workspace: false,
    workspace_depth: 1
};

