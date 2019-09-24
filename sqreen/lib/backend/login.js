/**
 * Copyright (c) 2016 - 2019 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const Logger = require('../logger');
const Path = require('path');
const Os = require('os');
const Fs = require('fs');
const V8 = require('v8');

const Reader = require('../package-reader');
const Version = require('../../version.json').version;

let appPackage = null;

module.exports.getPkg = function () {

    return appPackage;
};

const getLimits = module.exports._getLimits = function (pid, cb) {

    Fs.readFile(Path.join('/proc', `${pid}`, 'limits'), (err, res) => {

        if (err) {
            Logger.DEBUG(err);
            return cb('');
        }
        return cb(res.toString());
    });
};

/**
 * internal method
 * build login payload
 */
const buildPayload = module.exports._buildPayload = function (deps_signature, pid, process_limits) {

    const Config = require('../config');
    const config = Config.getConfig(true) || {};
    const appRoot = config.app_root || process.cwd();
    let pkg = Reader.readPackage(Path.join(appRoot, 'package.json'));
    if (!pkg) {
        const rt = require('../safeUtils').guessRoot();
        Logger.INFO('Guessing project root ' + rt);
        pkg = Reader.readPackage(Path.join(rt, 'package.json'));
    }
    Logger.DEBUG('is building the login payload');

    appPackage = pkg;

    let euid = -1;
    let egid = -1;
    let uid = -1;
    let gid = -1;

    try {
        // this fails on windows
        euid = process.geteuid();
        //$lab:coverage:off$
        egid = process.getegid();
        uid = process.getuid();
        gid = process.getgid();
        //$lab:coverage:on$
    }
    catch (e) {

        Logger.DEBUG(e); // That happens on windows, let's ignore for now
    }

    //$lab:coverage:off$
    const app_name = pkg && pkg.name || null;
    //$lab:coverage:on$ // FIXME
    if (!config.app_name) {
        Config.setAppName(app_name);
    }
    let hasSQNative = false;
    try {
        require('sq-native');
        hasSQNative = true;
    }
    catch (_) {}

    return {
        bundle_signature: deps_signature,
        various_infos: {
            time: new Date(),
            app_name,
            //$lab:coverage:off$ // FIXME
            app_version: pkg && pkg.version || null,
            //$lab:coverage:on$
            // declared_dependencies: pkg && pkg.dependencies || null,
            // declared_devdependencies: pkg && pkg.devDependencies || null,
            pid,
            ppid: null,
            euid,
            egid,
            uid,
            gid,
            name: process.title,
            cwd: process.cwd(),
            agent_path: __dirname,
            env_app_root: process.env.SQREEN_APP_ROOT,
            async_hook_env_type: typeof process.env.SQREEN_BETA_ASYNC_HOOKS,
            async_hook_env_value: process.env.SQREEN_BETA_ASYNC_HOOKS,
            cpu_counts: Os.cpus().length, // see https://nodejs.org/dist/latest-v10.x/docs/api/os.html#os_os_cpus
            process_limits,
            heap_stats: V8.getHeapStatistics(),
            custom_substring_ignore: process.env.SQREEN_CUSTOM_PKG_SUBSTRING_IGNORE,
            features: require('../command/features').read(),
            has_native_module: hasSQNative
        },
        agent_type: 'nodejs',
        agent_version: Version,
        os_type: Os.arch() + '-' + Os.type(),
        hostname: Os.hostname(),
        runtime_type: 'node',
        runtime_version: process.version,
        framework_type: '',
        framework_version: null,
        environment: process.env.NODE_ENV,
        app_name
    };
};

module.exports.getPayload = function () {

    const pid = process.pid;
    return new Promise((resolve) => {

        Reader.getDependenciesHash((sig) => {

            getLimits(pid, (limits) => {

                return resolve(buildPayload(sig, pid, limits));
            });
        });
    });
};

