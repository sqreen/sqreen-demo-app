/**
 * Copyright (c) 2016 - 2020 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
// This is an historical artifact to ensure good module resolution
require('../functionPatcher');
require('../whitelist');
const Util = require('../../util');
require('../../actions/index');
require('../budget');
require('../../fuzzer');

module.exports.isEmitter = module.exports._isEmitter = Util.isEmitter;
