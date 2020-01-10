/**
 * Copyright (c) 2016 - 2020 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';

const Rules = require('../../rules');

module.exports = function () {

    Rules.enforceRuleList([{
        hookpoint: {
            arguments_options: {},
            callback_class: 'InsertSqreenEscapeJadeCB',
            klass: 'jade:lib/compiler.js',
            method: 'prototype:bufferExpression'
        },
        name: 'xss_jade'
    }], true);
};
