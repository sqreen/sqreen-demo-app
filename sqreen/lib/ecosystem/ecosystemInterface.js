/**
 * Copyright (c) 2016 - 2020 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const Logger = require('../logger');
module.exports = class {

    constructor(name, logger) {

        this.name = name;
        this.logger = logger || Logger;
    }
};
