/**
 * Copyright (c) 2016 - 2020 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const ModuleHijacker = require('./moduleHijacker');
const DefaultMetrics = require('../metric/default');
const OldDefaultMetrics = require('../../lib_old/metric/default');

DefaultMetrics.enableCallCount();
OldDefaultMetrics.enableCallCount();
ModuleHijacker.enable();

require('http');
require('https');
