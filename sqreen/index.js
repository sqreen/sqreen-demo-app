/**
 * Copyright (c) 2016 - 2020 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
//noinspection Eslint
var nodeVersionSupported = require('./versionCheck')(process.version);
var requiredBefore;
var canStart = true;
if (!nodeVersionSupported) {
    console.error('The current version of Node.js is ' + process.version + ' which is not compatible with Sqreen');
    console.error('Sqreen will not start.');
    console.error('Documentation can be found at https://doc.sqreen.io/docs/nodejs-agent-compatibility');
    console.error('Please visit https://nodejs.org/en/download/releases/');
}
else {
    try { // being paranoid
        requiredBefore = require('./firstRequire').check();
    }
    catch (_) {}
    try {
        canStart = require('./uniqueLoad').canStart();
    }
    catch (_) {}
    // TODO: module for that
    //noinspection Eslint
    var unwanted = false;
    // atm, it seems that opbeat and Newrelic issues are fixed

// If opbeat is present and not started
    if (unwanted){
        console.error('Documentation can be found at https://doc.sqreen.io/docs/nodejs-agent-compatibility');
// in the doc, put an env variable to override this.
    }
    else if (canStart) {
        process.__sqreen_cb = false;
        if (require('semver').satisfies(process.version, '< 8.2.0') || process.env.SQREEN_USE_CLS === '1') {
            require('./vendor/continuation-local-storage/context');
        }
        require('./lib/instrumentation'); // enables instrumentation
        require('events'); // trigger events instanciation, FIXME: otherwise header insertion do not work anymore...
        require('vm'); // trigger events instanciation, FIXME
        require('http'); // Anyway we require them for wreck but still.
        require('https'); // linked to terrible loading in request-promise
        //noinspection Eslint
        var Logger = require('./lib/logger');
        Logger.DEBUG('Starting Sqreen');

        //noinspection Eslint
        var Config = require('./lib/config').getConfig(); // read the conf here
        Logger.DEBUG('Sqreen config loaded');

        //noinspection Eslint
        var Agent = require('./lib/agent');

        //noinspection Eslint
        /**
         * This function will be executed before the process ends
         */
        // https://nodejs.org/api/process.html#process_event_beforeexit
        // be fore exit, we logout sqreen
        process.once('beforeExit', function () {

            //noinspection Eslint
            Agent.stop();
        });

        var sigInt = function () {

            if (process.listeners('SIGINT').length === 0) {
                process.kill(process.pid, 'SIGINT');
            }
        };

        process.once('SIGINT', function () {

            Agent.stop()
                .then(sigInt)
                .catch(sigInt);
        });

        if (Config && Config.token && !Agent.STARTED()) {

            if (!Config.run_in_test) {
                Agent.start(Config, requiredBefore).catch(() => {});
            }
        }
        else if (Agent.STARTED()) {

            Logger.WARN('Sqreen was already started');
        }
        else if (!Config) {
            Logger.ERROR(`no Sqreen config found in ${process.cwd()} nor in environment variables!`);
            console.warn('Your application is NOT currently protected by Sqreen.');
        }
        else {
            Logger.ERROR('Sorry but we couldn\'t find your Sqreen token');
            console.warn('Your application is NOT currently protected by Sqreen.');
        }
    }
}

var SDK;
if (process._sqreen_sdk) {
    SDK = process._sqreen_sdk;
}
else {
    SDK = require('./lib/sdk');
    process._sqreen_sdk = SDK;
}

module.exports = SDK;
