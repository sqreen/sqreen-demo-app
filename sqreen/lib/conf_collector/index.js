/**
 * Copyright (c) 2016 - 2019 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const URL = require('url');
const Zxcvbn = require('zxcvbn');

const Exception = require('../exception/index.js');

const readPassword = function (pwd) {

    if (typeof pwd !== 'string') {
        return {
            score: -1, // no password
            crack_times_seconds: {
                online_throttling_100_per_hour: 0,
                online_no_throttling_10_per_second: 0,
                offline_slow_hashing_1e4_per_second: 0,
                offline_fast_hashing_1e10_per_second: 0
            },
            crack_times_display: {
                online_throttling_100_per_hour: 'no password',
                online_no_throttling_10_per_second: 'no password',
                offline_slow_hashing_1e4_per_second: 'no password',
                offline_fast_hashing_1e10_per_second: 'no password'
            }
        };
    }

    const stenght = Zxcvbn(pwd);
    return {
        score: stenght.score,
        crack_times_seconds: stenght.crack_times_seconds,
        crack_times_display: stenght.crack_times_display
    }
};

const getAuth = function (auth, urlstr) {

    /**
     * URL.parse will decode the uri components of the password part
     * meaning we can get some wild :s in here...
     */
    if (typeof auth === 'string') { // there is an auth part
        const split = auth.split(':');
        if (split.length > 2) { // there are colons in the pwd or username
            const match = /\/\/([^:]+):?(.*)?@/g.exec(urlstr);
            if (Array.isArray(match)) {
                return {
                    username: match[1],
                    password: readPassword(match[2])
                };
            }
            return null;
        }
        return {
            username: split[0],
            password: readPassword(split[1])
        };
    }
    return null;
};

const readURL = function (urlstr) {

    try {
        const url = URL.parse(urlstr);
        url.auth = getAuth(url.auth, urlstr);
        return url;
    }
    catch (e) {

        e.message += ' input: ' + urlstr;
        Exception.report(e).catch(() => {});
    }
    return null;
};

module.exports.readURL = readURL;
module.exports.readPassword = readPassword;
module.exports._getAuth = getAuth;
