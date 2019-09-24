/**
 * Copyright (c) 2016 - 2019 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
module.exports.getKey = function (key) {

    if (typeof key === 'string') {
        return key;
    }
    try {
        return JSON.stringify(buildKey(key, 0));
    }
    catch (err) {

        // should we report? I am afraid it would be too much
        return null;
    }
};

const buildKey = function (obj, depth) {

    if (depth > 3) {
        throw new Error('Items must have a max depth of 3');
    }

    if (obj === null || typeof obj === 'number') {
        throw new Error('Invalid key');
    }

    if (typeof obj === 'boolean') {
        return obj;
    }

    if (Array.isArray(obj) === true) {
        for (let i = 0; i < obj.length; ++i) {
            if (typeof obj[i] === 'object') {
                obj[i] = buildKey(obj[i], depth + 1);
            }
        }
        return obj;
    }

    const res = {};
    Object.keys(obj)
        .sort()
        .forEach((key) => {

            if (typeof obj[key] === 'object') {
                res[key] = buildKey(obj[key], depth + 1);
            }
            res[key] = obj[key];
        });

    return res;
};
