/**
 * Copyright (c) 2016 - 2020 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const Logger = require('../logger');
const Exception = require('../exception');
const Actions = require('./actions');

const AGENT_VERSION = require('../../package.json').version;

let responses = {};
const report = function (result) {

    Object.assign(responses, result);
    return Promise.resolve();
};

const handleCmdResult = function (command, output, err) {

    const success = err === null;
    let res;
    if (output !== null) {
        const answer = {
            status: success,
            output
        };
        const response = {};
        response[command.uuid] = answer;
        res = report(response);
    }
    else {
        res = Promise.resolve();
    }
    if (!success) {
        res = Exception.report(err);
    }
    return res;
};

module.exports.getResponses = function () {

    const result = Object.assign({}, responses);
    responses = {};
    return result;
};

/**
 * Command executor
 * @param command
 */
module.exports.execute = function (command, isLogin) {

    if (!command.name || !command.uuid) {
        Logger.INFO('Sqreen tried to execute an empty command');
        return Promise.resolve();
    }
    command.params = command.params || [];

    if (Actions[command.name]) { // is the command known
        Logger.DEBUG(`execute command ${command.name} with params ${JSON.stringify(command.params)}`);

        if (isLogin && command.name === 'instrumentation_enable') { // rules come with payload
            require('./features').switchInstrumentationState(true);
            require('../instrumentation/record').switchInstru(true);
            return handleCmdResult(command, command.pack_id, null);
        }

        return Actions[command.name](command.params, command.uuid)
            .then((output) => {

                return handleCmdResult(command, output, null);
            })
            .catch((err) => {

                Logger.INFO(`Sqreen command ${command.name} failed`);

                return handleCmdResult(command, err && err.toString(), err);
            });
    }
    const reason = `Command unsupported by Sqreen Agent ${AGENT_VERSION}: ${command.name}`;
    Logger.INFO(reason);
    return handleCmdResult(command, null, new Error(reason));
};
