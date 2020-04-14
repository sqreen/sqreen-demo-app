/**
 * Copyright (c) 2016 - 2020 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';

/**
 * Adding a module to this list will make it possible to instrument method directly exported by it
 * (`module.exports = function () {}`).
 * This is a dangerous operation as it might have side effects within the module.
 * Therefore, when adding something to this file, the following rules must be followed:
 * - testing the whole module locally with the agent enabled to ensure everything works properly (even methods that are not instrumented)
 * - checking the module source code (if available) and list all the internal usages of the exported function
 *
 * Anyone authoring a commit adding a new entry to this list is taking full responsibility of it.
 *
 * Seriously, please do not add anything here without serious testing.
 */

/**
 * example, to patch the file lib/index.js in the mod module, add:
 * mod: ['lib/index.js']
 */

module.exports = {
    // moduleName: ['relative path to the file in the module']
    md5: ['md5.js']
};

