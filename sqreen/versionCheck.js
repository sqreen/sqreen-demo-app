/**
 * Copyright (c) 2016 - 2019 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';

module.exports = function (version) {

    //noinspection Eslint
    var major = version.match(/(\d+)/)[1];
    return parseInt(major) >= 4;
};
