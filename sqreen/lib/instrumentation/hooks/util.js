/**
 * Copyright (c) 2016 - 2019 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const NS = require('./ns');

const FunctionPatcher = require('../functionPatcher');

const config = {
    reveal: typeof process.env.REVEAL_OUTPUT === 'string'
};

const holder = {
    inspectOutput: function (req, res,output) {},
    sqreenMiddleWare: function (req, res, next) {

        return next();
    }
};
FunctionPatcher.patchFunction(holder, 'sqreenMiddleWare', { name: 'sqreen' }, 'express');
FunctionPatcher.patchFunction(holder, 'inspectOutput', { name: 'sqreen' }, 'express');
module.exports.sqreenMiddleWare = holder.sqreenMiddleWare;

module.exports._shimBind = NS._shimBind;
module.exports._shimRun = NS._shimRun;
module.exports.getNS = NS.getNS;
module.exports._config = config;
module.exports._holder = holder;
