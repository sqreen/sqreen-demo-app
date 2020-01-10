/**
 * Copyright (c) 2016 - 2020 Sqreen. All Rights Reserved.
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

/**
 * Loop asynchronously on a callback.
 *
 * @param {(i: number, next: () => void) => void} cbk - A callback handling each iteration.
 * @param {number} delay - Delay between each iteration (in ms).
 */
module.exports.asyncWhile = (cbk, delay) => {

    // $lab:coverage:off$
    delay = delay > 0 ? delay : 1;
    // $lab:coverage:on$
    const loop = (i) => {

        const next = () => {

            Timers.setTimeout(loop, delay, i++);
        };
        cbk(i, next);
    };
    Timers.setImmediate(loop, 0);
};
