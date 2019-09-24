/**
 * Copyright (c) 2016 - 2019 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const FunctionPatcher = require('./functionPatcher');
const ENGINE_LIST = new Set(['jade']);

const enable = function () {

    if (process.__sqreen_escape) {
        return;
    }

    process.__sqreen_escape = function (str) {

        return str;
    };

    FunctionPatcher.patchFunction(process, '__sqreen_escape', { name: 'sqreen' });
};

module.exports.hook = function (moduleName) {

    if (ENGINE_LIST.has(moduleName)) {
        enable();
    }
};
