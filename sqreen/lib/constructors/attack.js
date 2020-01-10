/**
 * Copyright (c) 2016 - 2020 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const EVENT_TYPES = require('../enums/events').TYPE;
const SqreenEvent = require('../events');
const AsJSON = require('../rules/rules-callback/utils').asJson;

const Attack = function (atk, err) {

    this.rule_name = atk.rule_name;
    this.rulespack_id = atk.rulespack_id || '0';
    this.infos = atk.infos || {};
    this.time = new Date();
    this.client_ip = atk.client_ip || '';
    this.request = atk.request || {};
    this.params = atk.params || {};

    this.block = atk.block;
    this.test = atk.test;
    this.beta = atk.beta;
    this.learning = atk.learning;

    this.headers = atk.headers;

    if (atk.whitelist_match) {
        this.whitelist_match = atk.whitelist_match;
    }

    this.context = {
        backtrace: (err || (new Error(atk.rule_name))).stack.split('\n') // TODO: use 'prepareStackTrace' ?
    };
};

Attack.prototype.report = function () {

    setImmediate(() => {

        this.params = AsJSON(this.params);
        SqreenEvent.writeEvent(EVENT_TYPES.ATTACK, this);
    });
};

module.exports = Attack;
