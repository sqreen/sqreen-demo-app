'use strict';
const Patch = require('../functionPatcher');
const Shimmer = require('shimmer');

module.exports = function (identity, module) {

    Shimmer.wrap(module.prototype, 'authenticate', (orig) => {

        return function () {

            if (this._verify.__wrapped === undefined) {
                const holder = {
                    verify: this._verify
                };
                Patch.patchFunction(holder, 'verify', { name: identity.name }, '');
                const proto = Object.getPrototypeOf(this);
                if (proto.hasOwnProperty('_verify')) {
                    proto._verify = holder.verify;
                }
                else {
                    this._verify = holder.verify;
                }
            }
            return orig.apply(this, arguments);
        };
    });
};
