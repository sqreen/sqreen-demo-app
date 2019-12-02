#!/usr/bin/env node
/**
 * Copyright (c) 2016 - 2019 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const Commander = require('commander');
const Joi = require('joi-browser');

const Logger = require('../lib/logger');
Logger.transports.console.silent = true;  // turns logs off
const WAP = require('../lib/backend/wreckAsPromised');
Logger.transports.console.silent = true;  // turns logs on

const Defaults = require('../lib/config/default');

const PING_URL = `${Defaults.url}/sqreen/v0/ping`;

const optionSchema = Joi.object().keys({
    proxy: Joi.string().uri({
        scheme: ['http', 'https']
    }).default('')
});

const main = module.exports.main = function (options) {

    const valid = Joi.validate(options, optionSchema);
    if (valid.error) {
        process.exitCode = 1;
        return Promise.reject(valid.error.message);
    }

    WAP.setupProxy(valid.value.proxy);
    console.log(`Trying to reach Sqreen BackEnd (${PING_URL}) ` + (valid.value.proxy ? `through proxy ${valid.value.proxy}` : ''));
    const interval = setInterval(() => {

        process.stdout.write('.');
    }, 100);
    interval.unref();
    return WAP.GET(PING_URL, {})
        .then((r) => {

            clearInterval(interval);
            if (r.status !== true) {
                return Promise.reject(`Request successful but response payload was ${JSON.stringify(r)} instead of {"status":true}`);
            }
            return Promise.resolve();
        })
        .catch((e) => {

            clearInterval(interval);
            return Promise.reject(e);
        });
};

if (require.main === module) {
    Commander
        .usage('[options]')
        .option('-p, --proxy [url]', 'Define a proxy to use to connect to Sqreen BackEnd')
        .parse(process.argv);

    process.on('exit', (code) => {

        if (code === 0) {
            console.log('\nTEST SUCCESS: Could reach Sqreen Backend.');
        }
        else {
            console.log('\nTEST FAILURE: Could not reach Sqreen BackEnd.');
        }
    });

    main(Commander.opts())
        .catch((e) => {

            process.exitCode = 1;
            console.log('Connection Failed with error:');
            if (typeof e === 'string') {
                console.log(e);
            }
            else {
                console.log(JSON.stringify(e, null, 2));
            }
        });
}
