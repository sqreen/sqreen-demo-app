/**
 * Copyright (c) 2016 - 2019 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const Logger = require('../logger');
const Semver = require('semver');
// const AGENT_VERSION = require('../../package.json').version; // This version check is a backend thing
const Signature = require('./signature');
const Assert = require('assert');

/*const checkVersion = */module.exports._checkVersion = function (currentVersion, minVersion, maxVersion) {

    let check = Semver.satisfies(currentVersion, `>=${minVersion}`);
    if (maxVersion) {
        check = check && Semver.satisfies(currentVersion, `<=${maxVersion}`);
    }
    return check;
};

// checks that a rules can be executed by the current agent
module.exports.verifyRule = function (rule, doNotVerifySignature) {

    Logger.DEBUG(`verifying rule ${rule.name}`);

    /*    if (rule.agent_version && rule.agent_version.min) {
        Assert(checkVersion(AGENT_VERSION, rule.agent_version.min, rule.agent_version.max), `Agent version is ${AGENT_VERSION} < ${rule.agent_version.min}, refusing rule ${rule.name}`);
    }*/
    if (!doNotVerifySignature) {
        Assert(Signature.verifyRuleSignature(rule), `Signature invalid for rule ${rule.name}`);
    }
    if (rule.name === 'reveal_collect_req') {
        rule.data.values[0] = 1.0;
    }

    return true;
};

