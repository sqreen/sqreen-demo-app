/**
 * Copyright (c) 2016 - 2020 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const Logger = require('../logger');
const FunctionPatcher = require('./functionPatcher');
const HardPatches = require('./hardPatches');

let savedModules = module.exports._savedModules = module.exports.savedModules = {};
module.exports._init = function () {

    savedModules = module.exports._savedModules = module.exports.savedModules = {};
};

const makePatchable = function (mod, identity) {

    let key = identity.name;
    if (identity.relativePath) {
        key += ':' + identity.relativePath;
    }
    savedModules[key] = savedModules[key] || [];
    savedModules[key].push({ module: mod, identity, patched: [] });
};

const makeFctPatchable = function (mod, identity) {

    const holder = { mod };
    FunctionPatcher.patchFunction(holder, 'mod', identity, '');
    const res = holder.mod;
    makePatchable(res, identity);
    return res;
};

module.exports.patchModule = function (mod, identity) {

    if (!mod) {
        return mod;
    }

    Logger.DEBUG(`patching module ${identity.name}@${identity.version}/${identity.relativePath}`);

    if (typeof mod === 'function' && HardPatches[identity.name] !== undefined && HardPatches[identity.name].indexOf(identity.relativePath) > -1) {
        return makeFctPatchable(mod, identity);
    }

    if (typeof mod === 'function' || typeof mod === 'object') {
        makePatchable(mod, identity);
    }

    return mod;
};

module.exports.placePatch = function (updatePayload) {

    if (updatePayload.moduleName && updatePayload.moduleName.startsWith('global')) {
        const path = updatePayload.moduleName.split('.');
        let holder = global;
        path.shift(); // remove 'global' from the path;
        const method = updatePayload.methodName;
        for (let i = 0; i < path.length; ++i) {
            const key = path[i];
            if (!holder[key]) {
                return; // path does not exist
            }
            holder = holder[key];
        }
        if (typeof holder[method] === 'function') {
            FunctionPatcher.patchFunction(holder, method, {
                name: updatePayload.moduleName,
                core: true,
                internal: false
            }, '');
        }
        return;
    }


    let saveKey = updatePayload.moduleName;
    if (updatePayload.file) {
        saveKey += ':' + updatePayload.file;
    }
    if (!saveKey || !savedModules[saveKey]) { // module not saved
        return;
    }

    const methodName = updatePayload.methodName || '';
    toNextSavedOne: for (let i = 0; i < savedModules[saveKey].length; ++i) {
        const currentSavedModule = savedModules[saveKey][i];

        if (currentSavedModule.patched.indexOf(methodName) > -1) { // method already patched
            continue;
        }
        const path = methodName.split(/\.|\:/);
        const end = path.pop();
        let holder = currentSavedModule.module;
        for (let j = 0; j < path.length; ++j) {
            const k = path[j];
            if (!holder[k]) {
                continue toNextSavedOne;
            }
            holder = holder[k];
        }
        const identity = currentSavedModule.identity;
        FunctionPatcher.patchFunction(holder, end, identity, path.join('.'));
        currentSavedModule.patched.push(methodName);
    }
};
