/**
 * Copyright (c) 2016 - 2019 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const Logger = require('../logger');
const Util = require('../util');
const Semver = require('semver');
let instrumented = {};
let callbackWaiting = {};
/**
 * instrumented looks like:
 * instrumented[package_name][package_version][relative_path_of_the_file_in_the_package] = list of update callback function
 */

/**
 * returns the 'instrumented' object
 * @returns {{}}
 * @private
 */
module.exports._getInstrumented = function () {

    return instrumented;
};
// checks if a module is instrumented
module.exports.isInstrumented = function (packageName) {

    return !!instrumented[packageName];
};

module.exports._init = function () {

    instrumented = {};
    callbackWaiting = {};
};

const isWaiting = function (moduleName) {

    return moduleName in callbackWaiting;
};

const addToWaiting = module.exports._addToWaiting = function (updatePayload) {

    callbackWaiting[updatePayload.moduleName] = callbackWaiting[updatePayload.moduleName] || [];
    callbackWaiting[updatePayload.moduleName].push(updatePayload);
};

const stopWaiting = module.exports._stopWaiting = function (moduleName) {

    const cbList = callbackWaiting[moduleName] || [];
    callbackWaiting[moduleName] = null;
    for (let i = 0; i < cbList.length; ++i ) {
        update(cbList[i]);
    }
};

module.exports.clearWaitings = function () {

    callbackWaiting = {};
};

/**
 * register a new method as instrumentable
 * @param registerPayload
 */
// input: { moduleName: String, file?: String, methodName?: String, version?: String, updateCallback: Function }
module.exports.register = function (registerPayload) {

    const methodName = registerPayload.methodName || '';
    const file = registerPayload.file || '';
    const version = registerPayload.version || '';
    const moduleName = registerPayload.moduleName;
    const updateCallback = registerPayload.updateCallback;

    Logger.DEBUG(`Sqreen make instrumentation possible for ${methodName} in ${moduleName} ${version}`);
    Util.createPathInObject(instrumented, [moduleName, version, file, methodName]);

    if (!(instrumented[moduleName][version][file][methodName] instanceof Array)) {
        instrumented[moduleName][version][file][methodName] = [];
    }
    instrumented[moduleName][version][file][methodName].push(updateCallback);

    if (isWaiting(moduleName)) {
        stopWaiting(moduleName);
    }
};

const Patcher = require('./patcher');
/**
 * Call the update payload of a method. this changes the pre/post/fail callbacks
 * @param updatePayload
 * @returns {Array.<*>}
 */
// input: { moduleName: String methodName?: String, file?: String versions?: String, params: Any }
const update = module.exports.update = function (updatePayload) {

    Patcher.placePatch(updatePayload);

    const methodName = updatePayload.methodName || '';
    const file = updatePayload.file || '';
    updatePayload.versions = updatePayload.versions || '';

    const moduleName = updatePayload.moduleName;

    if (!instrumented[moduleName]) { // module is unknown, we throw
        addToWaiting(updatePayload);
        Logger.DEBUG(`module ${moduleName} is not instrumented`);
        return false;
    }

    const presentVersions = Object.keys(instrumented[moduleName]);
    const versions = presentVersions.filter((version) => {

        if (updatePayload.versions) {
            return Semver.satisfies(version, updatePayload.versions);
        }
        return true;
    });
    Logger.DEBUG(`update instrumentation of ${methodName} in ${moduleName}@${versions}/${file}`);

    if (versions.length === 0) { // no present version satisfies the given range, we throw
        addToWaiting(updatePayload);
        Logger.DEBUG(`module ${moduleName} versions ${presentVersions} are present and none satisfies ${updatePayload.versions}`);
        return false;
    }

    for (let i = 0; i < versions.length; ++i){ // for all versions that satisfies the given range

        if (!instrumented[updatePayload.moduleName][versions[i]][file]) {
            addToWaiting(updatePayload);
            continue;
        }

        const callbackList = instrumented[updatePayload.moduleName][versions[i]][file][methodName];

        if (!callbackList) {
            addToWaiting(updatePayload);
            continue;
        }

        for (let j = 0; j < callbackList.length; ++j) { // for all registered callbacks

            if (updatePayload.build) {
                updatePayload.build();
            }
            callbackList[j](updatePayload.params);
        }
    }

    return versions;
};

