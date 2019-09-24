/**
 * Copyright (c) 2016 - 2019 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const Vm = require('vm');

const getContext = function () {

    return Vm.createContext({});
};

const getInitScript = function (fctStr) {

    return Vm.createScript(`var ruleFct = ${fctStr}`);
};

/**
 * creates a sandbox context containing 'ruleFct' which is the function we got as string in parameter
 * @param fctStr
 */
// May throw !
module.exports.getExecContext = function (fctStr) {

    const context = getContext();
    const initScript = getInitScript(fctStr);
    initScript.runInNewContext(context);
    return context;
};

/**
 * Call the ruleFct of the context with te provided arguments (as an array)
 * @param execContext
 * @param params params as array
 * @param selfObject contextual this, can be empty
 */
// May throw !
module.exports.exec = function (execContext, params, selfObject) {

    execContext.params = params;
    execContext.selfObject = selfObject;
    Vm.runInContext('result = ruleFct.apply(selfObject, params);', execContext);
    return execContext.result;
};

