/**
 * Copyright (c) 2016 - 2019 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
/**
 * This is the list of the known commands and the related handlers
 */
'use strict';
const AsyncLock = require('async-lock');
const Logger = require('../logger');
const BackEnd = require('../backend');
const Agent = require('../agent');
const Features = require('./features');
const IpWhitelist = require('../instrumentation/whitelist');
const Login = require('../backend/login');
const Fuzzer = require('../fuzzer');
const Actions = require('../actions/index');

const lock = new AsyncLock();

// enforce reveal commands to be executed sequentially
const asReveal = (cbk) => lock.acquire('reveal', cbk);

const commands = {
    mock: function () { // For testing purpose

        return Promise.resolve();
    },
    mock_fail: function () { // For testing purpose

        return Promise.reject();
    },
    mock_fail_err: function () { // For testing purpose

        return Promise.reject(new Error('aa'));
    },
    record_stacktrace: function (params, uuid) {

        const SDK = require('../sdk/index');
        SDK.updateStackTraces(params);
        Logger.DEBUG(`collect stacktraces for event ${params.join(', ')} with uuid ${uuid}`);
        return Promise.resolve();
    },
    instrumentation_enable: function (params, uuid) {

        Logger.DEBUG(`enables instrumentation with uuid ${uuid}`);
        require('./features').switchInstrumentationState(true);
        return commands.rules_reload();
    },
    actions_reload: function (params, uuid) {

        Logger.DEBUG(`reload actionspack with uuid ${uuid}`);

        if (!Agent.SESSION_ID()) {
            return Promise.reject(new Error('agent is offline'));
        }

        return BackEnd.actionspack(Agent.SESSION_ID())
            .then((response) => {

                const failedList = Actions.enforceActionList(response.actions);
                if (failedList.length === 0) {
                    return {};
                }
                return { unsupported_actions: failedList };
            });

    },
    rules_reload: function (params, uuid) {

        Logger.DEBUG(`reload rulespack with uuid ${uuid}`);

        if (!Agent.SESSION_ID()) {
            return Promise.reject(new Error('agent is offline'));
        }
        return BackEnd.rulespack(Agent.SESSION_ID())
            .then((response) => {

                if (!response.pack_id) {
                    return '';
                }
                // const pack_id = response.pack_id; // TODO: track it
                const rules = response.rules;
                for (let i = 0; i < rules.length; ++i) {
                    rules[i].rulesPack = response.pack_id;
                }
                Logger.INFO(`got a new rulepack with ${rules.length} rules`);

                // remove all callbacks everywhere before reloading rules
                const Patch = require('../instrumentation/patch');
                Patch.removeAllCallbacks();

                const Rules = require('../rules'); // load here and not at the beginning of the script to prevent circular import issue
                const result = Rules.enforceRuleList(rules, !Features.read().rules_signature);

                if (!result) {
                    return Promise.reject(new Error(`invalid rulespack: ${response.pack_id}`));
                }

                return response.pack_id;
            });
    },
    instrumentation_remove: function (params, uuid) {

        Actions.init();
        Logger.INFO(`disabling instrumentation with uui ${uuid}`);
        const Patch = require('../instrumentation/patch');
        Patch.removeAllCallbacks();
        require('../actions/index.js').init(); // remove all security responses too
        require('../instrumentation/record').switchInstru(false);
        return Promise.resolve();
    },
    features_change: function (params, uuid) {

        Logger.INFO(`changing features to ${JSON.stringify(params)} with id ${uuid}`);
        return Promise.resolve(Features.change(params));
    },
    features_get: function (params, uuid) {

        Logger.INFO(`getting features to ${JSON.stringify(params)} with id ${uuid}`);
        return Promise.resolve(Features.read());
    },
    paths_whitelist: function (params, uuid) {

        if (!params[0] || !Array.isArray(params[0])) {
            return Promise.reject(new Error('invalid params'));
        }
        Logger.INFO(`Whitelisting paths ${params[0].join(',')} with uui ${uuid}`);
        const Whitelist = require('../instrumentation/whitelist');
        Whitelist.whitelistThesePaths(params[0]);
        return Promise.resolve();
    },
    force_logout: function (params, uuid) {

        // event drain is made at logout

        return commands.instrumentation_remove(params, uuid)
            .then(() => Agent.stop());
    },
    ips_whitelist: function (params, uuid) {

        Logger.INFO(`Whitelisting ips ${params[0].join(',')} with uui ${uuid}`);
        const ips = params[0];
        const max = Features.read().max_radix_size;
        if (ips.length > max) {
            const msg = `Tried to whitelist ${ips.length} IP addresses. MAX: ${max}`;
            Logger.INFO(msg);
            return Promise.reject(new Error(msg));
        }
        try {
            IpWhitelist.whitelistTheseIPs(ips);
        }
        catch (e) {
            return Promise.reject(e);
        }
        return Promise.resolve();
    },
    get_bundle: function (params, uuid) {

        Logger.INFO(`Collecting bundle with uui ${uuid}`);
        const Reader = require('../package-reader');

        const promiseDepsHash = function () {

            return new Promise((resolve) => {

                Reader.getDependenciesHash((hash) => {

                    return resolve(hash);
                });
            });
        };

        const pkg = Login.getPkg();
        const declared = {};
        if (pkg) {
            declared.dependencies = pkg.dependencies;
            declared.devDependencies = pkg.devDependencies;
        }

        return promiseDepsHash()
            .then((hash) => Reader.getDependencies(hash))
            .then((depResult) => {

                const bundle_signature = depResult.hash;
                const dependencies = depResult.deps;
                return BackEnd.bundle(Agent.SESSION_ID(), { bundle_signature, dependencies, declared });
            });
    },
    performance_budget: function (params, uuid) {

        let timeInMSeconds = params[0];

        if (timeInMSeconds === null || timeInMSeconds === undefined) {
            timeInMSeconds = Infinity;
        }

        if (typeof timeInMSeconds !== 'number') {
            return Promise.reject(new Error('Performance cap must be a number.'));
        }

        Logger.INFO(`Setting performance cap at ${timeInMSeconds} milliseconds with uui ${uuid}`);
        require('../instrumentation/budget').setBudget(timeInMSeconds);
        const DefaultMetrics = require('../metric/default.js');
        DefaultMetrics.enableRequestOvertime();
        return Promise.resolve();
    },
    report_routing_table: function (params, uuid) {

        return new Promise((resolve, reject) => {

            require('../instrumentation/record').collectTable((err, table) => {

                if (err) {
                    return reject(err);
                }
                const DataPoint = require('../data_point/index').DataPoint;

                (new DataPoint(DataPoint.KIND.COMMAND, 'report_routing_table', uuid, table)).report();
                return resolve();
            });
        });
    },
    reveal_reload: function (params, uuid) {

        return asReveal(() =>

            BackEnd.reveal_runtime(Agent.SESSION_ID())
                .then((response) => {

                    if (!response.status || !response.version) {
                        throw new Error('Reveal backend failed to send a runtime.');
                    }
                    Logger.INFO(`Reloading reveal runtime (version: ${response.version})`);
                    const res = Fuzzer.reload(response);
                    if (!res) {
                        throw new Error('Runtime reload failed...');
                    }
                    return;
                }));
    },
    reveal_start: function (params, uuid) {

        return asReveal(() => {

            if (!Fuzzer.ready()) {
                return Promise.reject(new Error('Reveal is not ready.'));
            }
            return BackEnd.reveal_requests(Agent.SESSION_ID())
                .then((response) => {

                    if (!response.status) {
                        throw new Error('Reveal backend failed to send a run.');
                    }
                    const runid = Fuzzer.start(response);
                    if (!runid) {
                        throw new Error('Reveal failed to start...');
                    }
                    return runid;
                });
        });
    },
    reveal_stop: function (params, uuid) {

        return asReveal(() =>

            Fuzzer.stop()
                .then((res) => {

                    if (!res) {
                        return Promise.reject(new Error('Reveal failed to stop.'));
                    }
                    return Promise.resolve();
                })
        );
    }
};
module.exports = commands;
