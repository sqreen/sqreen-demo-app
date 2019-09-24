/**
 * Copyright (c) 2016 - 2019 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const Director = require('../sqreenDirector');
const Logger = require('../../logger');
const FunctionPatcher = require('../functionPatcher');
const CB_STATUS = require('../../enums/cbReturn').STATUS;

const MODULE_NAME = 'body-parser';
const FILE = 'index.js';
const METHODS = ['json', 'raw', 'text', 'urlencoded'];

// In the future, this might be used as a general middleware wrapper

const patchMiddleware = function (identity, method) {

    Logger.DEBUG(`specific instrumentation: ${MODULE_NAME}/${method}`);

    const instrumentHolder = {
        '': function (req, res, next) {

            next();
        }
    };

    FunctionPatcher.patchFunction(instrumentHolder, '', identity, `closured:${method}`); // patch the white middleware to make it instrumentable
    Director.update({
        moduleName: MODULE_NAME,
        file: FILE,
        versions: identity.version,
        methodName: method,
        params: {
            postCbs: [
                {
                    method: function (args, value) {

                        return {
                            status: CB_STATUS.SKIP,
                            newReturnValue: function (req, res, next) {

                                value(req, res, (err) => {

                                    if (err) {
                                        return next(err);
                                    }
                                    instrumentHolder[''](req, res, next);
                                });
                            }
                        };
                    }
                }
            ]
        }
    });

};

module.exports = function (identity) {

    for (let i = 0; i < METHODS.length; ++i){
        try {
            patchMiddleware(identity, METHODS[i]);
        }
        catch (err) {
            Logger.DEBUG(`could not instrument body-parser: ${err}`);
        }
    }
};

module.exports._patchMiddleware = patchMiddleware;
