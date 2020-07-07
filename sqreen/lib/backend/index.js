/**
 * Copyright (c) 2016 - 2020 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
/**
 * Main method for back-end communications
 */
'use strict';
const Querystring = require('querystring');
const Logger = require('../logger');
const Routes = require('./routes');
const Login = require('./login');
const WAP = require('./wreckAsPromised');
const Util = require('../util');
const Utils = require('util');

const DELAY_RETRY = 1000;
const NB_RETRY = 6;

/**
 * Sqreen response filter on status
 * @param response
 */
const handleResponse = module.exports._handleResponse = function (response) {

    response = response === null ? { status: 'ok' } : response;

    if (response.status) {
        return Promise.resolve(response);
    }
    return Promise.reject(response);
};

const getRequest = function (options, nbRetry) {

    let prom;
    if (options.method === 'POST') {
        prom = WAP.POST(options.uri, { headers: options.headers }, options.body);
    }
    else if (options.method === 'GET') {
        const haveQuery = !!options.query && Object.keys(options.query).length > 0;
        const uri = haveQuery ? (options.uri + '?' + Querystring.stringify(options.query)) : options.uri;
        prom = WAP.GET(uri, { headers: options.headers });
    }
    else {
        return Promise.reject(new Error(`unhandled verb ${options.method}`));
    }
    for (let i = 0; i < nbRetry; ++i) {
        const delay = Math.min(i * DELAY_RETRY, 60 * 1000); // 1 minute max
        prom = prom.catch((err) => {

            if (err && err.statusCode === 401) {
                return Promise.reject(err);
            }
            return Util.timeout(delay).then(() => getRequest(options));
        });
    }
    return prom;
};

/**
 * unique method to execute queries on the client
 * @param {object} options objects
 * @param {string} verb (http verbs)
 * @param {?number} nb_retry
 */
const LoggedRp = module.exports._LoggedRp = function (options, verb, nb_retry) {

    Logger.DEBUG(`${options.method} ${options.uri}`);

    return getRequest(options, nb_retry || NB_RETRY)
        .then(handleResponse)
        .catch((response) => {

            if (response.statusCode === 401) {
                require('../agent').start(require('../config').getConfig())
                    .catch(() => {});
            }

            Logger.INFO(`invalid response: ${JSON.stringify(response)}`);
            Logger.INFO(`cannot ${verb}`);
            return Promise.reject(response);
        })
        .then((reponse) => {

            Logger.DEBUG(`${options.method} ${options.uri} (DONE)`);
            Logger.INFO(`${verb} success`);

            return reponse;
        });
};

/**
 * get request options for a POST request
 * @param uri
 * @param headers
 * @param body
 * @return {{headers: *, method: string, body: *, uri: string}}
 */
const getPostOptions = function (uri, headers, body) {

    return {
        method: 'POST',
        uri, headers, body
    };
};

/**
 * get request options for a GET request
 * @param uri
 * @param headers
 * @param query
 * @return {{headers: *, method: string, query: *, uri: string}}
 */
const getGetOptions = function (uri, headers, query) {

    return {
        method: 'GET',
        uri, headers, query
    };
};

const ping = function (url) {

    return WAP.GET(url, {}) // 1 retry and that's it
        .catch(() => WAP.GET(url, {}));
};
const pingBacks = module.exports.pingBacks = function () {

    ping(Routes.ping)
        .catch(() => {

            require('../agent_message/builder').backPingFailed(Routes.ping);
        });

    ping(Routes.signal_ping)
        .catch(() => {

            require('../agent_message/builder').ingestionPingFailed(Routes.signal_ping);
        });
};
/**
 * Process login
 * @param apiKey
 */
module.exports.login = function (apiKey, appName) {

    pingBacks();
    const login = function () {

        return Login.getPayload()
            .then((payload) => {

                appName = appName || payload.app_name;
                payload.app_name = undefined;

                const headers = { 'x-api-key': apiKey };
                if (appName) {
                    headers['x-app-name'] = appName;
                }

                const options = getPostOptions(Routes.login, headers, payload);
                Logger.INFO(`using token ${apiKey}`);
                return LoggedRp(options, 'login', NB_RETRY);
            })
            .then((response) => {

                require('../agent').setSESSION_ID(response.session_id);

                // execute specific tasks from this endpoint
                if (response.commands) {
                    const Command = require('../command');
                    Promise.all(response.commands.map((cmd) => {

                        cmd.pack_id = response.pack_id;
                        return Command.execute(cmd, true);
                    }))
                        .catch(() => {});
                }

                if (response.features) {
                    const Feature = require('../command/features');
                    Feature.change(response.features);
                }

                if (response.rules) {
                    const Rules = require('../rules');
                    response.rules.forEach((r) => {

                        r.rulesPack = response.pack_id;
                    });
                    const Feature = require('../command/features');
                    require('../rules/rules-callback/libSqreenCB').clearAll();
                    Rules.enforceRuleList(response.rules, !Feature.read().rules_signature);
                }

                if (response.actions) {
                    const Actions = require('../actions/index');
                    Actions.enforceActionList(response.actions);
                }

                if (response.known_agent_messages) {
                    require('../agent_message/index').initKnownMessages(response.known_agent_messages);
                }

                return response.session_id;
            });
    };

    return login()
        .catch(() => Util.timeout(DELAY_RETRY).then(() =>  login()))
        .catch((err) => {

            Logger.ERROR(`cannot login. Token may be invalid: ${apiKey}`);
            console.error(`cannot login. Token may be invalid: ${apiKey}`);
            Logger.FATAL('Sqreen has encountered an error and could not connect:');
            Logger.FATAL(Utils.inspect(err));

            console.warn(err.code, err.message.error);
            return Promise.reject(err);
        });
};

module.exports.logout = function (session_id) {

    return LoggedRp(getGetOptions(Routes.logout, { 'x-session-key': session_id }), 'logout');
};

module.exports.actionspack = function (session_id) {

    return LoggedRp(getGetOptions(Routes.actions_reload, { 'x-session-key': session_id }), 'actions_reload');
};

module.exports.heartBeat = function (session_id) {

    const useSignals = require('../command/features').featureHolder.use_signals;
    let metrics = [];
    if (useSignals === true) {
        require('../metric').getAllReports(true);
    }
    else {
        metrics = require('../../lib_old/metric').getAllReports(true);
    }

    return LoggedRp(getPostOptions(Routes.beat, { 'x-session-key': session_id }, {
        command_results: require('../command').getResponses(),
        metrics
    }), 'heartbeat');
};

module.exports.request_record = function (session_id, payload) {

    return LoggedRp(getPostOptions(Routes.request_record, { 'x-session-key': session_id }, payload), 'report request_record');
};
module.exports.attack = function (session_id, payload) {

    return LoggedRp(getPostOptions(Routes.attack, { 'x-session-key': session_id }, payload), 'report attack');
};

module.exports.batch = function (session_id, batchList) {

    return LoggedRp(getPostOptions(Routes.batch, { 'x-session-key': session_id }, { batch: batchList }), 'report batch');
};

module.exports.exception = function (session_id, payload) {

    return LoggedRp(getPostOptions(Routes.exception, { 'x-session-key': session_id }, payload), 'report exception');
};

module.exports.commands = function (session_id, payload) {

    return LoggedRp(getPostOptions(Routes.commands, { 'x-session-key': session_id }, payload), 'report command');
};

module.exports.metrics = function (session_id, payload) {

    return LoggedRp(getPostOptions(Routes.metrics, { 'x-session-key': session_id }, payload), 'report metrics');
};

module.exports.rulespack = function (session_id) {

    return LoggedRp(getGetOptions(Routes.rulespack, { 'x-session-key': session_id }), 'get rulespack');
};

module.exports.bundle = function (session_id, payload) {

    return LoggedRp(getPostOptions(Routes.bundle, { 'x-session-key': session_id }, payload), 'post bundle');
};

module.exports.agent_message = function (session_id, payload) {

    return LoggedRp(getPostOptions(Routes.agent_message, { 'x-session-key': session_id }, payload), 'post agent_message');
};

module.exports.data_point = function (session_id, payload) {

    return LoggedRp(getPostOptions(Routes.data_point, { 'x-session-key': session_id }, payload), 'post data_point');
};

module.exports.reveal_runtime = function (session_id, query) {

    return LoggedRp(getGetOptions(Routes.reveal_runtime, { 'x-session-key': session_id }, query), 'get reveal/runtime');
};

module.exports.reveal_run = function (session_id, query) {

    return LoggedRp(getGetOptions(Routes.reveal_run, { 'x-session-key': session_id }, query), 'get reveal/run');
};

module.exports.signal_batch = function (session_id, payload) {

    return LoggedRp(getPostOptions(Routes.signal_batch, { 'x-session-key': session_id }, payload), 'post signal/batch');
};
