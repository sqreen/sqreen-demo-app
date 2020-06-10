/**
 * Copyright (c) 2016 - 2020 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const EcosystemInterface = require('../ecosystem/ecosystemInterface');
const Exception = require('../exception');

const NAME = 'agent';
const agentInterface = module.exports = new EcosystemInterface(NAME);

agentInterface.reportError = function (err) {

    Exception.report(err).catch(() => {});
};
