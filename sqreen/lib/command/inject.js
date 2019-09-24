/**
 * Copyright (c) 2016 - 2019 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const Crypto = require('crypto');
const Logger = require('../logger');
const Command = require('./index');

const isDebug = process.env.SQREEN_DEBUG && ['true', '1'].indexOf(process.env.SQREEN_DEBUG.toLowerCase()) !== -1;

module.exports.isCmdReq = function (req) {

    return !!(req.method === 'POST' && req.url.startsWith('/sqreen/command'));
};

module.exports.isCmdInjectable = function (command) {

    if (!isDebug) {
        return false;
    }
    if (command) {
        return !!command.is_injected;
    }
    return true;
};

const handleCmd = function (command) {

    if (!command.name) {
        return Promise.reject(new Error('invalid command in request'));
    }
    if (!command.uuid) {
        command.uuid = Crypto.randomBytes(32).toString('hex');
    }
    command.params = command.params || [];
    command.is_injected = true;

    Logger.DEBUG(`inject command ${command.name} with params ${JSON.stringify(command.params)}`);
    return Command.execute(command)
        .catch((err) => {

            if (err && err.message) {
                Logger.ERROR(`"${command.name}" command injection failed with "${err.message}"`);
            }
            else {
                Logger.ERROR(`"${command.name}" command injection failed`);
            }
            throw err;
        });
};

module.exports.handleCmdReq = function (req, res) {

    return new Promise((resolve, reject) => {

        let body = [];
        req.on('data', (chunk) => {

            body.push(chunk);
        }).on('end', () => {

            body = Buffer.concat(body).toString();
            try {
                resolve(JSON.parse(body));
            }
            catch (e) {
                reject(new Error('invalid JSON in request'));
            }
        }).on('error', () => {

            reject(new Error('invalid POST request'));
        });
    })
        .then(handleCmd)
        .then((output) => {

            res.statusCode = 200;
            output = output || '';
            if (!Buffer.isBuffer(output) && !(typeof output === 'string')) {
                res.setHeader('Content-Type', 'application/json');
                output = JSON.stringify(output);
            }
            else {
                res.setHeader('Content-Type', 'text/plain');
            }
            res.write(output);
            return res;
        })
        .catch((err) => {

            res.writeHead(500, { 'Content-Type': 'text/plain' });
            if (err && err.message) {
                res.write(`${err.message}`);
            }
            return res;
        });
};
