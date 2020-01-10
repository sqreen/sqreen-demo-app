/**
 * Copyright (c) 2016 - 2020 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const Director = require('../sqreenDirector');
const Patch = require('../functionPatcher');

const INSTRUCTIONS = {
    'passport-http': [{ file: 'lib/passport-http/index.js', method: 'BasicStrategy', holderName: 'BasicStrategy' }],
    'passport-saml': [{ file: 'lib/passport-saml/index.js', method: 'Strategy', holderName: 'Strategy' }]
};

module.exports = function (identity) {

    if (!INSTRUCTIONS[identity.name]) {
        return;
    }

    INSTRUCTIONS[identity.name].forEach((item) => {

        const method = function (args) {

            const verifyRank = args.length - 1;

            const holder = {
                verify: args[verifyRank]
            };

            Patch.patchFunction(holder, 'verify', { name: identity.name }, item.holderName);

            args[verifyRank] = holder.verify;
        };
        method.noBudget = true;

        Director.update({
            moduleName: identity.name,
            file: item.file,
            versions: identity.version,
            methodName: item.method,
            params: {
                preCbs: [
                    {
                        method
                    }
                ]
            }
        });
    });
};
