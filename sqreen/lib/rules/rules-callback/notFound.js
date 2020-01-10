/**
 * Copyright (c) 2016 - 2020 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
/**
 * Return the callback reporting of 404
 * @author vdeturckheim
 * @framework none
 * @target http['']['']['ServerResponse.prototype:writeHead']
 * @returns {{pre: pre}}
 */
module.exports.getCbs = function () {

    return {
        pre: function (args, value, rule, selfObject, session) {

            if (!session || !session.req) {
                return;
            }

            if (args[0] === 404) {

                session.req.headers = session.req.headers || {};

                return {
                    record: {
                        path: session.req.url,
                        host: session.req.headers.host,
                        verb: session.req.method,
                        ua: session.req.headers['user-agent']
                    }
                };
            }
        }
    };
};
