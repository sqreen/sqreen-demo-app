/**
 * Copyright (c) 2016 - 2019 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const Logger = require('../logger');
const Module = require('module');
const Path = require('path');
const Fs = require('fs');

const STR_NODE_MODULES = 'node_modules';
/**
 * list of modules whose internal instrumentation is forced
 * @type {string[]}
 */
const FORCED_HJ = ['mysql', 'pg', 'jade', 'hapi', 'express'];

const SEP = Path.sep;

const buildModuleDate = module.exports._buildModuleData = function (pathToModule) {

    const modulePart = pathToModule.split(STR_NODE_MODULES).pop(); // get the part of th pathe after 'node_modules'
    const splittedModulePart = modulePart.split(SEP)
        .filter((part) => !!part); // remove empty strings

    let name;
    if (modulePart.indexOf(SEP + '@') === 0) { // detect scoped modules (ie. @owner/name)
        name = Path.join(splittedModulePart[0], splittedModulePart[1]);
    }
    else {
        name = splittedModulePart[0];
    }

    const baseDir = pathToModule.slice(0, pathToModule.lastIndexOf(STR_NODE_MODULES) + STR_NODE_MODULES.length) + SEP + name;
    const relativePath = pathToModule.split(baseDir + SEP).pop().split(SEP).join('/');

    const results = { name: name.split(SEP).join('/'),baseDir: baseDir.split(SEP).join('/'), relativePath };
    Logger.DEBUG(`Sqreen has identified the module ${results.name}`);

    return results;
};

module.exports.scan = function (request, parent) {

    const pathToModule = Module._resolveFilename(request, parent);

    const isCore = pathToModule.indexOf(SEP) < 0; // FIXME: decide if we need to specially manipulate lib/internal in the core...
    const isInternal = !isCore && pathToModule.indexOf(STR_NODE_MODULES) < 0;

    if (isInternal) {
        return {
            internal: true,
            core: false
        };
    }

    if (!isCore) {
        const info = buildModuleDate(pathToModule);
        info.core = false;
        info.internal = false;
        info.forceHj = FORCED_HJ.indexOf(info.name) > -1;

        try {
            const rawPkg = Fs.readFileSync(Path.join(info.baseDir, 'package.json'));
            const pkg = JSON.parse(rawPkg);
            info.declaredName = pkg.name;
            info.version = pkg.version;
        }
        catch (err) {
            Logger.DEBUG(`could not find the package.json on ${info.name}`);
        }

        return info;
    }
    return {
        name: pathToModule,
        core: true,
        internal: false,
        forceHj: FORCED_HJ.indexOf(pathToModule) > -1
    };
};

