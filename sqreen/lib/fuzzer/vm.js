/**
 * Copyright (c) 2019 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
// @ts-check
'use strict';

const Vm = require('vm');

const PROLOGUE = `
    exports = module.exports;
`;

const VM = module.exports.VM = class {
    /**
     * @param {string | Buffer} code - A JavaScript code.
     */
    constructor(code) {

        this._init(code);
    }

    /**
     * @param {string | Buffer} code - A JavaScript code.
     */
    _init(code) {

        const initialContext = {
            exports: null,
            module: { exports: {} },
            SHARED: {}
        };
        this._context = Vm.createContext(initialContext);
        const prolog = VM.createScript(PROLOGUE);
        prolog.runInNewContext(this._context);
        const script = VM.createScript(code);
        script.runInContext(this._context);
    }

    /**
     * @param {string | Buffer} code - A JavaScript code.
     * @returns {Vm.Script}
     */
    static createScript(code) {
        // @ts-ignore
        return Vm.createScript(code);
    }

    /**
     * @param {Vm.Script} script - A precompiled script.
     * @returns {function}
     */
    static runInVMContext(vm, script) {

        return function () {

            vm._context.SHARED.API_ARGS = arguments;
            vm._context.SHARED.API_RESULT = undefined;
            script.runInContext(vm._context);
            const result = vm._context.SHARED.API_RESULT;
            vm._context.SHARED.API_ARGS = null;
            vm._context.SHARED.API_RESULT = null;
            return result;
        };
    }

    /**
     * @param {Vm.Script} script - A precompiled script.
     * @returns {function}
     */
    runInContext(script) {

        const self = this;
        return function () {

            return VM.runInVMContext(self, script).apply(VM, arguments);
        };
    }

    /**
     * @param {string} name
     * @returns {Vm.Script}
     */
    static importAPI(name) {

        return VM.createScript(`SHARED.API_RESULT = module.exports.${name}.apply(null, SHARED.API_ARGS);`);
    }
};
