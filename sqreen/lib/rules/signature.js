/**
 * Copyright (c) 2016 - 2020 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const Logger = require('../logger');
const Crypto = require('crypto');
const Assert = require('assert');

const SIGNED_FIELDS = new Set([
    'hookpoint',
    'name',
    'callbacks',
    'conditions'
]);
const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIGbMBAGByqGSM49AgEGBSuBBAAjA4GGAAQA39oWMHR8sxb9LRaM5evZ7mw03iwJ
WNHuDeGqgPo1HmvuMfLnAyVLwaMXpGPuvbqhC1U65PG90bTJLpvNokQf0VMA5Tpi
m+NXwl7bjqa03vO/HErLbq3zBRysrZnC4OhJOF1jazkAg0psQOea2r5HcMcPHgMK
fnWXiKWnZX+uOWPuerE=
-----END PUBLIC KEY-----`;

/**
 * Normalize the provided object to a string:
 *  - sort keys lexicographically, recursively
 *  - convert each scalar to its JSON representation
 *  - convert hash to '{key:value}'
 *  - convert array [v1,v2] to '[v1,v2]' and [] to '[]'
 * Two hash with different key ordering should have the same normalized
 * value.
 */
const sortObject = function (obj) {

    if (!(obj instanceof Object)) {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(sortObject);
    }

    const result = {};
    Object.keys(obj).sort().forEach((key) => {

        result[key] = sortObject(obj[key]);
    });

    return result;
};

const normalize = module.exports._normalize = function (obj) {

    return JSON.stringify(sortObject(obj));
// Obsolete version
/*    if (!obj) {
        return '';
    }
    if (typeof obj === 'string') {
        return `"${obj}"`;
    }
    if (obj instanceof Array) {
        return `[${obj.map(normalize)}]`;
    }
    if (obj instanceof Object) {
        return `{${Object.keys(obj).sort().map((key) => `${isNaN(key) ? normalize(key) : key}:${normalize(obj[key])}`).join(',')}}`;
    }

    return obj;*/
};

const getNormalizedPayloadAndSignature = module.exports._getNormalizedPayload = function (rule, sigVersion) {

    Assert(!!rule.signature, `no signature in rule ${rule.name} | ${rule.description}`);

    const versions = Object.keys(rule.signature);
    Assert(versions.length > 0, `no signature in rule ${rule.name} | ${rule.description}`);

    sigVersion = sigVersion || versions[0];
    Assert(!!rule.signature[sigVersion], `no signature in rule ${rule.name} | ${rule.description}`);

    const keys = rule.signature[sigVersion].keys;

    Assert(SIGNED_FIELDS.size <= keys.length);
    SIGNED_FIELDS.forEach((signedKey) => Assert(keys.indexOf(signedKey) > -1));

    const prePayload = {};
    for (let i = 0; i < keys.length; ++i){
        prePayload[keys[i]] = rule[keys[i]];
    }

    return {
        payload: normalize(prePayload),
        signature: rule.signature[sigVersion].value
    };
};

module.exports.verifyRuleSignature = function (rule) {

    Logger.DEBUG(`checking signature for rule ${rule.name}`);

    const ruleData = getNormalizedPayloadAndSignature(rule, 'v0_9');
    const payload = ruleData.payload;
    const signature = new Buffer(ruleData.signature, 'base64');

    const verify = Crypto.createVerify('sha512');

    verify.update(payload);

    return verify.verify(PUBLIC_KEY, signature);
};



