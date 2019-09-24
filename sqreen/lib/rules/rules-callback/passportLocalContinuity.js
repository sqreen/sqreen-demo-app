/**
 * Copyright (c) 2016 - 2019 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
// It is valid for any passport strategy actually
module.exports.getCbs = function () {

    return {
        pre: function (args, value, rule, selfObject, session) {

            if (!session.raw.active && selfObject && selfObject._verify) { // see https://github.com/othiym23/node-continuation-local-storage/blob/master/context.js#L26
                const verify = selfObject._verify; // see https://github.com/jaredhanson/passport-local/blob/master/lib/strategy.js#L86
                selfObject._verify = function () {

                    const self = this;
                    const verif_arg = arguments;
                    session.raw.run(() => {

                        session.raw.set('req', args[0]);
                        session.raw.set('res', args[0].__sqreen_res);
                        return verify.apply(self, verif_arg);
                    });
                };
            }
            else {
                if (!session.req) {
                    session.raw.set('req', args[0]);
                }
                if (!session.res) {
                    session.raw.set('res', args[0].__sqreen_res);
                }
            }
        }
    };
};
