/**
 * Copyright (c) 2016 - 2020 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const Config = require('../config').getConfig() || {
    url: require('../config/default').url, ingestion_url: require('../config/default').ingestion_url
};

const V0 = 'v0';
const V1 = 'v1';

module.exports = {
    login: Config.url + '/sqreen/' + V1 + '/app-login',
    bundle: Config.url + '/sqreen/' + V0 + '/bundle',
    logout: Config.url + '/sqreen/' + V0 + '/app-logout',
    metrics: Config.url + '/sqreen/' + V0 + '/metrics',
    beat: Config.url + '/sqreen/' + V1 + '/app-beat',
    exception: Config.url + '/sqreen/' + V0 + '/sqreen_exception',
    commands: Config.url + '/sqreen/' + V0 + '/commands',
    batch: Config.url + '/sqreen/' + V0 + '/batch',
    attack: Config.url + '/sqreen/' + V0 + '/attack',
    rulespack: Config.url + '/sqreen/' + V0 + '/rulespack',
    request_record: Config.url + '/sqreen/' + V0 + '/request_record',
    actions_reload: Config.url + '/sqreen/' + V0 + '/actionspack',
    agent_message: Config.url + '/sqreen/' + V0 + '/agent_message',
    data_point: Config.url + '/sqreen/' + V0 + '/data_point',
    // Reveal
    reveal_runtime: Config.url + '/sqreen/' + V1 + '/reveal/runtime/1',
    reveal_run: Config.url + '/sqreen/' + V1 + '/reveal/run',
    ping: Config.url + '/ping',
    signal_batch: Config.ingestion_url + '/batches',
    signal_ping: Config.ingestion_url + '/ping'
};
