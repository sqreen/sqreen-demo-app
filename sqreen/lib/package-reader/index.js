/**
 * Copyright (c) 2016 - 2020 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
/**
 * This script is to be run at startup, therefore synchronous operations are permitted
 */
'use strict';
//noinspection Eslint
const Logger = require('../logger');
const Path = require('path');
const Fs = require('fs');
const Crypto = require('crypto');

const Config = require('../config');
const SafeUtil = require('../safeUtils');

// TODO: idea: get current module and explore its paths to find the dependency root and th package.json file
// TODO: ignore sqreen's deps

const superLister = function (root) {

    var todos = [root];
    var results = [];

    while (todos.length > 0) {

        var dirPath = todos.pop();
        var isNodeModules = dirPath.endsWith('node_modules');

        if (isNodeModules) {
            var content = Fs.readdirSync(dirPath);
            for (var i = 0; i < content.length; ++i) {
                var path = Path.join(dirPath, content[i]);
                const stat = Fs.lstatSync(path);
                if (stat.isDirectory() && !stat.isSymbolicLink()) { // handle cnpm
                    todos.push(path);
                }
            }
        }
        else if (Path.basename(dirPath).startsWith('@')) { // scoped packages
            const subs = Fs.readdirSync(dirPath).map((x) => Path.join(dirPath, x));
            todos = todos.concat(subs);
        }
        else {
            var path = Path.join(dirPath, 'package.json');
            if (Fs.existsSync(path)) {
                try {
                    var item = JSON.parse(Fs.readFileSync(Path.join(dirPath, 'package.json'), 'utf8'));
                    results.push({ name: item.name, version: item.version });
                    item = null;
                }
                catch (_) {
                    // ignore err
                }
            }
            var nmPath = Path.join(dirPath, 'node_modules');
            if (Fs.existsSync(nmPath)) {
                todos.push(nmPath)
            }
        }
    }

    return results;
};

const listModules = module.exports.listModules = function (root) {

    try {
        return Promise.resolve(superLister(root));
    }
    catch (err) {
        return Promise.reject(err);
    }
};

module.exports.readPackage = function (path) {

    let raw;

    try {
        raw = Fs.readFileSync(path, 'utf-8');
    }
    catch (err) {
        Logger.DEBUG(`Sqreen could not read the content of ${path}`);
        return;
    }

    let pkg = {};
    try {
        pkg = JSON.parse(raw);
    }
    catch (err) {
        Logger.INFO(`Sqreen could not parse the content of ${path}. Is it a valid JSON file ?`);
        return;
    }

    pkg._sq_path = path;
    return pkg;
};

let hashCache = '';
module.exports.getDependenciesHash = function (callback) {

    if (hashCache) {
        return callback(hashCache);
    }

    const baseDir = Config.getConfig(true).app_root;
    const hash = Crypto.createHash('sha1');

    const pkgPath = Path.join(baseDir, 'package.json');
    Fs.readFile(pkgPath, (err, content) => {

        if (err) {
            return callback('');
        }
        try {
            const pkg = JSON.parse(content);
            const deps = Object.assign({}, pkg.dependencies, pkg.devDependencies);
            const toHash = Object.keys(deps)
                .map((name) => `${name}-${deps[name]}`)
                .sort().join('|');
            hash.update(toHash);
            hashCache = hash.digest('hex');
            return callback(hashCache);
        }
        catch (e) {
            return callback('');
        }
    });
};

const isBaseDir = function (from) {

    const content = Fs.readdirSync(from);
    return content.indexOf('node_modules') > -1;
};

const addSignature = function (bundlePart) {

    const deps = bundlePart.deps;
    const hash = Crypto.createHash('sha1');
    const toHash = deps.map((x) => `${x.name}-${x.version}`)
        .sort()
        .join('|');
    hash.update(toHash);
    const signature = hash.digest('hex');
    return { deps, hash: signature };
};


module.exports.getDependencies = function (signature) {

    const config = Config.getConfig(true);
    let baseDir = config.app_root;
    if (!isBaseDir(baseDir)) {
        const old = baseDir;
        baseDir = SafeUtil.guessRoot();
        if (!isBaseDir(baseDir)) {
            Logger.DEBUG(`Sqreen has not found 'node_modules' directory in ${baseDir} or ${old}`);
            return Promise.reject(new Error(`no 'node_modules' directory at project root -  tried ${old} and ${baseDir}`));
        }
    }
    let res = listModules(Path.join(baseDir, 'node_modules'))
        .then((deps) => ({ deps, hash: signature }));

    if (config.use_workspace === true) {
        // We are in a workspace. Let's get upstairs and check if this is a
        // yarn root (i.e. it has a yarn.lock file
        const upstairs = Path.dirname(baseDir);

        const getUpstairs = listModules(Path.join(upstairs, 'node_modules'))
            .catch(() => []);

        res = Promise.all([res, getUpstairs])
            .then((result) => {

                const final = result[0];
                const ups = result[1];
                final.deps = final.deps.concat(ups);
                return final;
            });
    }


    if (signature) {
        return res;
    }
    return res.then(addSignature);
};
