/**
 * Copyright (c) 2016 - 2020 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const Patcher = require('../patcher');
const Director = require('../sqreenDirector');
const CB_STATUS = require('../../enums/cbReturn').STATUS;

const FILE = 'dist/cjs/handlebars/runtime.js';
const METHOD_NAME = 'template';

module.exports = function (identity) {

    const holder = {
        template: function (fn, context) {

            return fn(context);
        }
    };
    identity = Object.assign({}, identity, { relativePath: 'closure' });
    Patcher.patchModule(holder, identity);

    Director.update({
        moduleName: identity.name,
        file: FILE,
        versions: identity.version,
        methodName: METHOD_NAME,
        params: {
            postCbs: [
                {
                    method: function (args, value) {

                        return {
                            status: CB_STATUS.SKIP,
                            newReturnValue: function (context) {

                                return holder.template(value, context);
                            }
                        };
                    }
                }
            ]
        }
    });
};
