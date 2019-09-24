/**
 * Copyright (c) 2016 - 2019 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const Winston = require('winston');
const Mkdirp = require('mkdirp');
const Path = require('path');

const logLevels = {
    UNKNOWN: 0,
    FATAL: 1,
    ERROR: 2,
    WARN: 3,
    INFO: 4,
    DEBUG: 5
};

const formatter = (options) =>  `${options.level.charAt(0)} ${options.timestamp()} ${options.level} --: ${(options.message)}`;
const timestamp = () => new Date();

const Logger = new (Winston.Logger)({
    levels: logLevels,
    transports: [
        new (Winston.transports.Console)({
            level: 'WARN', timestamp, formatter
        })
    ]
});

module.exports = Logger;
module.exports.Logger = Logger;

module.exports.logLevels = {
    UNKNOWN: 'UNKNOWN',
    FATAL: 'FATAL',
    ERROR: 'ERROR',
    WARN: 'WARN',
    INFO: 'INFO',
    DEBUG: 'DEBUG'
};

module.exports.addFileTransport = function (filename, level) {

    if (!filename) {
        return;
    }
    if (Logger.transports.file) {
        return;
    }

    filename = Path.join(Path.dirname(filename), (new Date()) + '-' + Path.basename(filename));

    Mkdirp.sync(Path.dirname(filename)); // ensure path exists
    Logger.add(Winston.transports.File, { level, timestamp, filename });
};
