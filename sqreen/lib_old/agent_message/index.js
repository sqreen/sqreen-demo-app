/**
 * Copyright (c) 2016 - 2020 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
//$lab:coverage:off$

const Crypto = require('crypto');

const Events = require('../events/index');
const EVENT_TYPES = require('../../lib/enums/events').TYPE;

const knownMessages = new Set();

const AgentMessage = class {

    constructor(kind, message, infos) {

        this.kind = kind;
        this.message = message || '';
        this.infos = infos || {};
        const hash = Crypto.createHash('sha1');
        hash.update(this.message);
        this.id = hash.digest('hex');
    }

    canReport() {

        return !knownMessages.has(this.id);
    }

    report() {

        if (!this.canReport()) {
            return Promise.resolve();
        }
        knownMessages.add(this.id);
        return Events.writeEvent(EVENT_TYPES.AGENT_MESSAGE, this);
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
//$lab:coverage:on$
