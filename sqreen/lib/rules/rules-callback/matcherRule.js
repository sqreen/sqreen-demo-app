/**
 * Copyright (c) 2016 - 2019 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';

// str is the string and value is what we lookup in it
// one fay we will benchmark that vs indexOf
const lookup = {
    anywhere: (value, str) => str.includes(value),
    starts_with: (value, str) => str.startsWith(value),
    ends_with: (value, str) => str.endsWith(value),
    equals: (value, str) => str === value
};

const getStringMatcher = function (options, value) {

    let lookuper = lookup.anywhere;
    for (let i = 0; i < options.length; ++i) {
        lookuper = lookup[options[i]] || lookuper;
    }
    return options.indexOf('case_sensitive') >= 0 ? (str) => lookuper(value, str) : (str) => lookuper(value, str.toLowerCase());
};

const getRegexpFlags = (options) => `${options.indexOf('case_sensitive') >= 0 ? '' : 'i'}${options.indexOf('multiline') >= 0 ? 'm' : ''}`;

const getMatcher = function (inputObject) {

    const options = inputObject.options || [];
    const value = inputObject.value || '';
    const type = inputObject.type || '';

    let matcher;
    switch (type) {
        case 'string':
            matcher = getStringMatcher(options, value);
            break;
        case 'regexp':
            matcher = (str) => !!str.match(new RegExp(value, getRegexpFlags(options)));
            break;
        default:
            matcher = () => false;
    }

    return {
        name: value,
        matcher
    };
};

/**
 * Helper to get matchers
 * @param inputTable
 * @returns {*|{}|Array}
 */
module.exports.getMatcherList = function (inputTable) {

    return inputTable.map(getMatcher);
};
