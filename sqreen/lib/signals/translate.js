/**
 * Copyright (c) 2016 - 2019 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const SignalUtils = require('./utils'); // enable Batch
const SqreenSDK = require('sqreen-sdk');
const EVENT_TYPES = require('../enums/events').TYPE;
const Util = require('../util');

const TRANSFORMS = module.exports.TRANSFORMS = {};

const infra = SignalUtils.infra;
const Attack = require('../constructors/attack');

TRANSFORMS[EVENT_TYPES.ATTACK] = function (atk) {

    const source = `sqreen:rule:${atk.rulespack_id}:${atk.rule_name}`;
    const signal = `sq.agent.attack.${atk[Attack.kAttack_type]}`; // TODO: update rules to map on OWASP
    const item = new SqreenSDK.Point(signal, source, atk.time);
    item.location = {
        infra,
        stack_trace: atk.backtrace
    };
    item.payload_schema = SignalUtils.PAYLOAD_SCHEMA.ATTACK;
    item.payload = {
        test: atk.test,
        block: atk.block,
        beta: atk.beta,
        infos: atk.infos
    };
    item.context = {
        type: 'http',
        request: {
            // TODO
        }
    };
    return item;
};

TRANSFORMS[EVENT_TYPES.ERROR] = function (sqErr) {

    let source;
    const name = 'sq.agent.exception';
    if (sqErr.rule_name) {
        source = `sqreen:rule:${sqErr.rulespack_id}:${sqErr.rule_name}`;
    }
    else {
        source = SignalUtils.SIGNAL_AGENT_VERSION;
    }

    const item = new SqreenSDK.Point(name, source);
    item.payload_schema = SignalUtils.PAYLOAD_SCHEMA.EXCEPTIONS;
    item.location = {
        infra,
        stack_trace: sqErr.context.backtrace.map(Util.parseStackTraceLine).filter((x) => x !== null)
    };
    item.payload = {
        message: sqErr.message,
        klass: sqErr.klass,
        infos: sqErr.infos
    };
    return item;
};

TRANSFORMS[EVENT_TYPES.DATA_POINT] = function (dp) {

    const source = `sqreen:agent:${dp.kind}`; // FIXME
    const signalName = dp.signal_identifier; // FIXME
    const payload = dp.infos;
    const time = dp.time;
    const pt = new SqreenSDK.Point(signalName, source, time); // TODO;
    pt.location = { infra };
    pt.payload = payload;
    return pt;
};

/*
TRANSFORMS[OTHER_TYPES.LOGIN] = function (login) {

    const pt = new SqreenSDK.Point('sqreen:agent', 'sqreen.agent.login');
    pt.location = { infra };
    pt.payload = login;
    return pt;
};
*/

/*
TRANSFORMS[OTHER_TYPES.HEART_BEAT] = function (command_results) {

    const pt = new SqreenSDK.Point('sqreen:agent', 'sq.agent.command_results');
    pt.location = { infra };
    pt.payload = { command_results };
    return pt;
};
*/

/*TRANSFORMS[OTHER_TYPES.BUNDLE] = function (uuid, payload) {

    const source = `sqreen:command:${uuid}:get_bundle`;
    const name = 'sq.application.bundle';
    const time = new Date();
    payload.type = 'bundle';
    return new SqreenSDK.Point(source, name, payload, time);
};*/

