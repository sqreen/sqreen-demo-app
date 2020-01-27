/**
 * Copyright (c) 2016 - 2020 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
// @ts-check
'use strict';
const Pino = require('pino-multi-stream');
const Mkdirp = require('mkdirp');
const Path = require('path');
const Fs = require('fs');

/**
 * @typedef {import('pino').BaseLogger} BaseLogger
 * @typedef {import('pino').LogFn} LogFn
 *
 * @typedef {{
 *     FATAL: LogFn,
 *     ERROR: LogFn,
 *     WARN: LogFn,
 *     INFO: LogFn,
 *     DEBUG: LogFn,
 * }} SqreenLoggerLevels
 *
 * @typedef {{
 *   logLevels: Record<string, string>,
 *   initLogger: () => void,
 *   addFileTransport: (filename: string, level: keyof SqreenLoggerLevels) => void,
 *   setConsoleLevel: (level: keyof SqreenLoggerLevels) => void,
 *   enableLog: (isEnable: boolean) => void
 * } & SqreenLoggerLevels & BaseLogger } SqreenLogger
 */

const logLevels = {
    UNKNOWN: 'fatal',
    FATAL: 'fatal',
    ERROR: 'error',
    WARN: 'warn',
    INFO: 'info',
    DEBUG: 'debug'
};

let logStreams = [];

/** @type SqreenLogger */
const toExports = {};

toExports.logLevels = {
    UNKNOWN: 'UNKNOWN',
    FATAL: 'FATAL',
    ERROR: 'ERROR',
    WARN: 'WARN',
    INFO: 'INFO',
    DEBUG: 'DEBUG'
};

toExports.initLogger = function () {

    logStreams = [
        {
            level: 'warn',
            stream: process.stdout
        }
    ];

    bootstrapLogger(logStreams);
};

toExports.addFileTransport = function (filename, level) {

    if (!filename) {
        return;
    }

    filename = Path.join(Path.dirname(filename), ((new Date()).getTime() + '-' + Path.basename(filename)));

    Mkdirp.sync(Path.dirname(filename)); // ensure path exists
    logStreams.push({
        level: logLevels[level],
        stream: Fs.createWriteStream(filename)
    });

    bootstrapLogger(logStreams);
};

toExports.setConsoleLevel = function (level) {

    logStreams[0] = {
        level: logLevels[level],
        stream: process.stdout
    };

    bootstrapLogger(logStreams);
};

toExports.enableLog = function (isEnable) {

    bootstrapLogger((isEnable !== false) ? logStreams : []);
};

const bootstrapLogger = function bootstrapLogger(streams) {

    const Logger = Pino({
        streams
    });

    for (const logName of Object.keys(logLevels)) {
        Logger[logName] = Logger[logLevels[logName]];
    }

    module.exports = /** @type SqreenLogger */ (Object.assign(Logger, { Logger }, toExports));
};

bootstrapLogger(logStreams);

