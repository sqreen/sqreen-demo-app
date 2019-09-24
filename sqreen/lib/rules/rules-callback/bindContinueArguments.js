/**
 * Copyright (c) 2016 - 2019 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const BindContinueTracingArgumentsCB = class {

    constructor() {

        const self = this;
        this.pre = function (args, value, _, selfObject, session) {

            return self.placeContinuity(args, value, _, selfObject, session);
        };
    }

    placeContinuity(args, value, _, selfObject, session) {

        if (!session || !session.raw || !session.raw.bind || !session.req || !session.res) {
            return null;
        }

        const req = session.req;
        const res = session.res;

        for (let i = 0; i < args.length; ++i) {

            if (args[i].length) {
                const list = args[i];
                for (let j = 0; j < list.length; ++j) {

                    if (typeof args[i][j] === 'function') {
                        const orig = args[i][j];
                        args[i][j] = function () {

                            return session.raw.runAndReturn(() => {

                                session.raw.set('req', req);
                                session.raw.set('res', res);
                                return orig.apply(this, arguments);
                            });
                        };
                    }
                }
            }

            if (typeof args[i] === 'function') {
                const orig = args[i];
                args[i] = function () {

                    return session.raw.runAndReturn(() => {

                        session.raw.set('req', req);
                        session.raw.set('res', res);
                        return orig.apply(this, arguments);
                    });
                };
            }

        }
    }
};

module.exports.getCbs = function () {

    return new BindContinueTracingArgumentsCB();
};
