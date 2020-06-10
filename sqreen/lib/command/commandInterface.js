/**
 * Copyright (c) 2016 - 2020 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const EcosystemInterface = require('../ecosystem/ecosystemInterface');
const Feature = require('./features');


const NAME = 'command';
const commandInterface = module.exports = new EcosystemInterface(NAME);

commandInterface.features = {
    read: Feature.read,
    emitter: Feature.FEATURE_EMITTER
};

