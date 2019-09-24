/**
 * Copyright (c) 2016 - 2019 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */

'use strict';
const Recursive = require('recursive-readdir');
const Path = require('path');

const ignoreFunc = function (file, stats) {

    // `file` is the absolute path to the file, and `stats` is an `fs.Stats`
    // object returned from `fs.lstat()`.
    return stats.isDirectory() && Path.basename(file) === '.bin';
};

module.exports = function (root, cb) {

    return Recursive(root, [ignoreFunc], cb);
};
