/**
 * Copyright (c) 2016 - 2019 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const NS = require('./ns');
const Fs = require('fs');
const Path = require('path');

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

module.exports.hasCookieParser = function () {

    try {
        const res = JSON.parse(Fs.readFileSync(Path.join(process.cwd(), 'package.json')).toString());
        return !!(res.dependencies && res.dependencies['cookie-parser']);
    }
    catch (_) {
        return false;
    }
};

module.exports._shimBind = NS._shimBind;
module.exports._shimRun = NS._shimRun;
module.exports.getNS = NS.getNS;
module.exports._config = config;
module.exports._holder = holder;
