/**
 * Copyright (c) 2016 - 2019 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
/**
 * This script is to be run at startup, therefore synchronous operations are permitted
 */
'use strict';
const Logger = require('../logger');
const Joi = require('joi');
const Fs = require('fs');
const Path = require('path');

const DEFAULT = require('./default');

const LOG_LEVELS = Object.keys(Logger.levels);

const configSchema = Joi.object().keys({
    url: Joi.string().uri().default(DEFAULT.url),
    token: Joi.string().required(),
    local_rules: Joi.string().optional(),
    rules_verify_signature: Joi.boolean().truthy('true', 'yes', 1, '1').falsy('false', 'no', 0, '0').default(DEFAULT.rules_verify_signature),
    log_level: Joi.string().only(LOG_LEVELS).default(DEFAULT.log_level),
    log_location: Joi.string().default(DEFAULT.log_location),
    run_in_test: Joi.boolean().truthy('true', 'yes', 1, '1').falsy('false', 'no', 0, '0').default(DEFAULT.run_in_test),
    block_all_rules: Joi.boolean().truthy('true', 'yes', 1, '1').falsy('false', 'no', 0, '0').default(DEFAULT.block_all_rules),
    report_perf_newrelic: Joi.boolean().truthy('true', 'yes', 1, '1').falsy('false', 'no', 0, '0').default(DEFAULT.report_perf_newrelic),
    initial_features: Joi.string().default(DEFAULT.initial_features),
    http_proxy: Joi.string().uri().optional(),
    ip_header: Joi.string().default(DEFAULT.ip_header),
    strip_sensitive_data: Joi.boolean().default(DEFAULT.strip_sensitive_data),
    app_root: Joi.string().default(DEFAULT.app_root),
    app_name: Joi.string().default(''),
    strip_sensitive_keys: Joi.array().items(Joi.string()).default(DEFAULT.strip_sensitive_keys),
    strip_sentitive_regex: Joi.array().items(Joi.object().type(RegExp)).default(DEFAULT.strip_sentitive_regex),
    heartbeat_delay: Joi.number().positive().max(120).default(DEFAULT.heartbeat_delay)
});

let agentConfig;
let APP_NAME = '';

/**
 * config validator
 * @param rawConfig
 */
const parseConfig = function (rawConfig) {

    if (rawConfig.log_level && LOG_LEVELS.lastIndexOf(rawConfig.log_level) < 0){
        rawConfig.log_level = Logger.logLevels.WARN;
    }

    const result = Joi.validate(rawConfig, configSchema);

    if (result.error) {
        // if an error happens, it is logged and return nothing
        Logger.ERROR(result.error.message);
        return;
    }
    const config = result.value;
    Logger.transports.console.level = config.log_level;

    Logger.addFileTransport(config.log_location, config.log_level);

    if (config.local_rules) {
        try {
            const Rules = require('../rules'); // load here and not at the beginning of the script to prevent circular import issue
            Rules.enforceRuleList(JSON.parse(Fs.readFileSync(config.local_rules, 'utf-8')), !config.rules_verify_signature);
        }
        catch (err) {
            Logger.DEBUG(`Could not load local rules ${err}`);
        }
    }

    if (config.initial_features) {
        try {
            require('../command/features').change(JSON.parse(Fs.readFileSync(config.initial_features, 'utf-8')));
        }
        catch (err) {
            Logger.DEBUG(`Could not load initial features ${err}`);
        }
    }

    return config;
};

const asBoolean = function (str) {

    return str === 'true' || str === '1';
};

/**
 * read conf, first in a file then oevrrides it with env variables
 */
const tryeReadConfigFile = function (path, encoding) {

    try {
        const readJson = Fs.readFileSync(path, encoding);
        return JSON.parse(readJson);
    }
    catch (err) {
        Logger.INFO(`Sqreen could not parse content of ${path}. Is it a valid JSON file?`);
        Logger.INFO(err.message);
    }
};

const encodings = [
    'utf8',
    'utf-8',
    'ascii',
    'binary',
    'ucs2',
    'ucs-2',
    'utf16le',
    'utf-16le',
    'hex',
    'base64'
]; // see https://github.com/nodejs/node/blob/master/lib/buffer.js

const readConfigFile = function (path) {

    for (const encoding of encodings) {
        const res = tryeReadConfigFile(path, encoding);
        if (res && Object.keys(res).length > 0) {
            return res;
        }
    }
    return undefined;
};

const readConfig = function (from) {

    let config = {};
    if (APP_NAME) {
        config.app_name = APP_NAME;
    }

    // get the base dir of the process
    let path;
    if (process.env.SQREEN_CONFIG_FILE) {
        path = process.env.SQREEN_CONFIG_FILE;
    }
    else {
        const baseDir = process.cwd();

        // get the content of this directory
        const baseDirContent = Fs.readdirSync(baseDir);

        // if a configuration exists in a json file, we use it
        if (baseDirContent.indexOf('sqreen.json') > -1) {
            // we checked that the file existed
            path = Path.join(baseDir, 'sqreen.json');
        }
    }

    if (!path) {
        // let's try to guess the project root
        const potentialRoot = require('../safeUtils').guessRoot(from);
        const potentialBaseDirContent = Fs.readdirSync(potentialRoot);
        if (potentialBaseDirContent.indexOf('sqreen.json') > -1) {
            // we checked that the file existed
            path = Path.join(potentialRoot, 'sqreen.json');
        }
    }

    if (path) {
        config = readConfigFile(path) || config;
    }

    if (config.disable) {
        config.run_in_test = config.disable;
        delete config.disable;
    }

    // env variables overrides file content.
    if (process.env.SQREEN_URL) {
        config.url = process.env.SQREEN_URL;
    }
    if (process.env.SQREEN_TOKEN) {
        config.token = process.env.SQREEN_TOKEN;
    }
    if (process.env.SQREEN_RULES) {
        config.local_rules = process.env.SQREEN_RULES;
    }
    if (process.env.SQREEN_RULES_SIGNATURE) {
        config.rules_verify_signature = asBoolean(process.env.SQREEN_RULES_SIGNATURE);
    }
    if (process.env.SQREEN_LOG_LEVEL) {
        config.log_level = process.env.SQREEN_LOG_LEVEL;
    }
    if (process.env.SQREEN_LOG_LOCATION) {
        config.log_location = process.env.SQREEN_LOG_LOCATION;
    }
    if (process.env.SQREEN_RUN_IN_TEST) {
        config.run_in_test = asBoolean(process.env.SQREEN_RUN_IN_TEST);
    }
    if (process.env.SQREEN_DISABLE) {
        config.run_in_test = asBoolean(process.env.SQREEN_DISABLE);
    }
    if (process.env.SQREEN_BLOCK_ALL_RULES) {
        config.block_all_rules = asBoolean(process.env.SQREEN_BLOCK_ALL_RULES);
    }
    if (process.env.SQREEN_REPORT_PERF_NR) {
        config.report_perf_newrelic = asBoolean(process.env.SQREEN_REPORT_PERF_NR);
    }
    if (process.env.SQREEN_INITIAL_FEATURES) {
        config.initial_features = process.env.SQREEN_INITIAL_FEATURES;
    }
    if (process.env.SQREEN_HTTP_PROXY) {
        config.http_proxy = process.env.SQREEN_HTTP_PROXY;
    }
    if (process.env.SQREEN_HEARTBEAT_DELAY) {
        config.heartbeat_delay = parseInt(process.env.SQREEN_HEARTBEAT_DELAY, 10);
    }
    if (process.env.SQREEN_IP_HEADER) {
        config.ip_header = process.env.SQREEN_IP_HEADER;
    }
    if (process.env.SQREEN_STRIP_SENSITIVE_DATA) {
        config.strip_sensitive_data = asBoolean(process.env.SQREEN_STRIP_SENSITIVE_DATA);
    }
    if (process.env.SQREEN_APP_ROOT) {
        config.app_root = process.env.SQREEN_APP_ROOT;
    }
    if (process.env.SQREEN_APP_NAME) {
        config.app_name = process.env.SQREEN_APP_NAME;
    }
    if (process.env.SQREEN_STRIP_SENSITIVE_KEYS) {
        config.strip_sensitive_keys = process.env.SQREEN_STRIP_SENSITIVE_KEYS
            .split(',')
            .map((x) => x.trim());
    }
    if (process.env.SQREEN_STRIP_SENSITIVE_REGEX) {
        config.strip_sentitive_regex = process.env.SQREEN_STRIP_SENSITIVE_REGEX
            .split(',')
            .map((x) => x.trim())
            .map((x) => new RegExp(x));
    }

    if (Array.isArray(config.strip_sentitive_regex)) {
        config.strip_sentitive_regex = config.strip_sentitive_regex
            .map((x) => new RegExp(x));
    }

    return config;
};

/**
 * load and cache the config
 * @param {boolean} [force] force the reloading of th config.. use with caution
 * @returns {*}
 */
const getConfig = function (force) {

    if (!agentConfig || force) {
        agentConfig = parseConfig(readConfig());
    }
    return agentConfig;
};

const setAppName = function (app_name) {

    agentConfig.app_name = app_name;
    APP_NAME = app_name;
};


module.exports = {
    parseConfig,
    readConfig,
    getConfig,
    setAppName
};
