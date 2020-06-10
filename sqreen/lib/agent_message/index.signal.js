/**
 * Copyright (c) 2016 - 2020 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const Crypto = require('crypto');

const SqreenSDK = require('sqreen-sdk');
const SignalUtils = require('../signals/utils');


const knownMessages = new Set();

const AgentMessage = class extends SqreenSDK.Point {

    constructor(kind, message, infos) {

        super('sqreen:agent', 'sq.agent.message.' + kind, new Date());

        infos = infos || {};
        message = message || '';
        const hashCreator = Crypto.createHash('sha1');
        hashCreator.update(message);
        const hash = hashCreator.digest('hex');

        this.payload_schema = 'agent_message/2020-01-01T00:00:00.000Z';
        this.payload = {
            infos, message, hash
        };
        this.location_infra = { infra: SignalUtils.infra };
    }

    canReport() {

        return !knownMessages.has(this.payload.hash);
    }

    report() {

        if (!this.canReport()) {
            return Promise.resolve();
        }
        knownMessages.add(this.payload.hash);
        this.BATCH.add(this);
        return Promise.resolve();
    }

    static initKnownMessages(messageList) {

        for (const message of messageList) {
            knownMessages.add(message);
        }
    }
};

AgentMessage.KIND = {
    first_require: 'first_require',
    agent_required_twice: 'agent_required_twice',
    no_sq_native: 'no_sq-native'
};

module.exports = AgentMessage;
