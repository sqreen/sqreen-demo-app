/**
 * Copyright (c) 2016 - 2019 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';

// goes to jade['1.11.0']['lib/compiler.js']['prototype:bufferExpression']
const JADE = 'jade';

module.exports.getCbs = function () {

    // TODO: one day, see if we remove the hook in the hijacker and only keep this side effect here, right now, it is more a watchdog
    if (!process.__sqreen_escape) {
        require('../../instrumentation/templateEngines').hook(JADE);
    }

    const pre = function (args) {

        const code = args[0];
        if (code && code.indexOf('__sqreen_escape(') < 0 && code.indexOf('jade.escape') < 0) {
            args[0] = `process.__sqreen_escape(${code})`;
        }
    };

    pre.noBudget = true;

    return { pre };
};
