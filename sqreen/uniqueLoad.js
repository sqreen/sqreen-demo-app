/**
 * Copyright (c) 2016 - 2019 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
module.exports.canStart = function () {

    const KEYS = require('./lib/enums/agent').PROCESS_KEYS;
    const MESSAGES = require('./lib/enums/agent').INTERNAL_MESSAGES;
    const version = require('./version').version;

    if (!process[KEYS.SQREEN_VERSION]) {
        // no other loaded agent
        process[KEYS.SQREEN_VERSION] = version;
        return true;
    }
    // agent has been loaded twice
    process.emit(MESSAGES.SQREEN_LOADED_TWICE, { current: version, existing: process[KEYS.SQREEN_VERSION] });

    const messages = `Another version of Sqreen has already been loaded (version ${process[KEYS.SQREEN_VERSION]})\n`
    + `current agent (version ${version} will not start).`;
    console.log(messages);
    console.error(messages);
    return false;
};
