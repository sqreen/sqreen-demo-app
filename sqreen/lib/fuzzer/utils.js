/**
 * Copyright (c) 2019 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
// @ts-check
'use strict';

// needed due to a bug in tsserver...
const Timers = require('timers');

/**
 * Iterate over a (potentially large) array in an async (non-blocking) way.
 *
 * @param {Array} arr - An input array.
 * @param {(value: any, i: number, next: () => boolean) => void} cbk - A callback handling each item.
 * @param {{ delay?: number, chunklen?: number }} [options] - Some useful options.
 */
module.exports.asyncForEach = (arr, cbk, options) => {

    options = options || {};
    const len = Array.isArray(arr) ? arr.length : 0;
    if (len < 1) {
        return;
    }
    const delay = options.delay || 1;
    const chunklen = options.chunklen || 1;
    const loop = (i) => {

        const next = () => {

            i += chunklen;
            if (i < len) {
                Timers.setTimeout(loop, delay, i);
                return true;
            }
            return false;
        };
        if (chunklen < 2) {
            cbk(arr[i], i, next);
        }
        else {
            cbk(arr.slice(i, i + chunklen), i, next);
        }
    };
    Timers.setImmediate(loop, 0);
};
