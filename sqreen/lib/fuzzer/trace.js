/**
 * Copyright (c) 2019 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
// @ts-check
'use strict';

const Path = require('path');

/**
 * @typedef {object} CallSite
 * @typedef {{scriptpath: string, scriptfile: string, funcname: string, line: number}} Sym
 * @typedef {Sym[]} Syms
 * @typedef {(scriptpath: string) => boolean} FrameFilter
 */
/**
 * @param {CallSite[]} frames - A list of v8 CallSite.
 * @param {FrameFilter | undefined} [filter] - An optional callback filtering frames based on script path.
 * @returns Syms
 */
const getStackSymbols = function (frames, filter) {

    if (!Array.isArray(frames)) {
        return [];
    }
    /** @type Syms */
    const symbols = [];
    const hasFilter = typeof filter === 'function';
    for (let i = 0; i < frames.length; ++i) {
        const frame = frames[i];
        const script = frame.getScriptNameOrSourceURL();
        // $lab:coverage:off$
        if (!script || (hasFilter && filter(script))) {
            continue;
        }
        // $lab:coverage:on$
        const funcname = getFrameFuncName(frame);
        // $lab:coverage:off$
        if (!funcname) {
            continue;
        }
        // $lab:coverage:on$
        const scriptpath = Path.dirname(script);
        const scriptfile = Path.basename(script);
        const line = frame.getLineNumber();
        symbols.push({
            scriptpath,
            scriptfile,
            funcname,
            line
        });
    }
    return symbols;
};

/**
 * Gather a list of v8 CallSite using a fake exception.
 *
 * @returns {CallSite[]}
 */
const getStackTrace = function () {

    const orig = Error.prepareStackTrace;
    Error.prepareStackTrace = function (_, stack) {

        return stack;
    };
    const err = new Error();
    Error.captureStackTrace(err, getStackTrace);
    /** @type {CallSite[]} */
    // Invalid signature...
    // @ts-ignore
    const stack = err.stack;
    Error.prepareStackTrace = orig;
    return stack;
};

/**
 * Render the name of a method / function from a v8 CallSite object.
 *
 * @param {CallSite} frame - A v8 CallSite object.
 * @returns {string | undefined}
 */
const getFrameFuncName = function (frame) {

    const mtype = frame.getTypeName();
    const mname = frame.getFunctionName();
    // $lab:coverage:off$
    if (!mtype && !mname) {
        return;
    }
    const name = mname !== null ? mname : '<anonymous>';
    return mtype !== null ? `${mtype}.${name}` : `${name}`;
    // $lab:coverage:on$
};

module.exports = {
    getStackTrace,
    getStackSymbols
};
