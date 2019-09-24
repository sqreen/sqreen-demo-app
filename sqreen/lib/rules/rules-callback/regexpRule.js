/**
 * Copyright (c) 2016 - 2019 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
/**
 * helper to use regex from rule
 * @param inputObject
 * @returns {function(*): boolean}
 */
module.exports.getRegexpMatcher = function (inputObject) {

    if (!inputObject || typeof inputObject !== 'string') {
        //noinspection JSValidateTypes
        return;
    }
    return (str) => !!str.match(new RegExp(inputObject, 'i'));
};

const RegexpMatcher = class {

    constructor(inputObject) {

        if (typeof inputObject === 'string') {
            this.regex = new RegExp(inputObject, 'i');
            this.pattern = inputObject;
        }
    }

    match(str) {

        if (!this.regex || typeof str !== 'string') { // no real regex, nothing matches
            return false;
        }
        return !!str.match(this.regex);
    }
};

module.exports.getRegexpMatcherObject = function (inputObject) {

    return new RegexpMatcher(inputObject);
};
