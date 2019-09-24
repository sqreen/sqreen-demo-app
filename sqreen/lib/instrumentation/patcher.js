/**
 * Copyright (c) 2016 - 2019 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const Logger = require('../logger');
const FunctionPatcher = require('./functionPatcher');

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

module.exports.patchModule = function (mod, identity) {

    if (!mod) {
        return mod;
    }

    Logger.DEBUG(`patching module ${identity.name}@${identity.version}/${identity.relativePath}`);

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
    for (let i = 0; i < savedModules[saveKey].length; ++i) {
        const currentSavedModule = savedModules[saveKey][i];

        if (currentSavedModule.patched.indexOf(methodName) > -1) { // method already patched
            continue;
        }

        // format: [key].['prototype']:[method]
        const hasPrototype = methodName.indexOf('.prototype') > -1;
        let key;
        let end;
        if (hasPrototype) {
            const splitted = methodName.split(':');
            end = splitted.pop();
            key = splitted.shift().replace('.prototype', '');
        }
        else {
            if (methodName.indexOf(':') > -1) {
                const splitted = methodName.split(':');
                end = splitted[1];
                key = splitted[0];
            }
            else {
                key = methodName;
            }
        }

        const identity = currentSavedModule.identity;

        if (currentSavedModule.module[key]) {

            const curr = currentSavedModule.module[key];
            if (hasPrototype) {
                if (!curr.prototype || !curr.prototype[end]) {
                    continue;
                }
                currentSavedModule.patched.push(methodName);
                FunctionPatcher.patchFunction(curr.prototype, end, identity, key + '.prototype');
                continue;
            }
            else if (end) {
                if (!curr[end]) {
                    continue;
                }
                currentSavedModule.patched.push(methodName);
                FunctionPatcher.patchFunction(curr, end, identity, key);
                continue;
            }
            currentSavedModule.patched.push(methodName);
            FunctionPatcher.patchFunction(currentSavedModule.module, key, identity, '');
        }
    }
};
