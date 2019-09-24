/**
 * Copyright (c) 2016 - 2019 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';

module.exports = {
    'body-parser': require('./bodyParserHook'),
    'passport-local': require('./passportLocalHook'),
    'passport-http': require('./passportSimpleHook'),
    'passport-saml': require('./passportSimpleHook'),
    jade: require('./jadeHook'),
    q: require('./qHook'),
    express: require('./expressHook'),
    bluebird: require('./bluebirdHook'),
    hapi: require('./hapiHook'),
    knex: require('./knexHook'),
    bcrypt: require('./bcryptHook')
};
