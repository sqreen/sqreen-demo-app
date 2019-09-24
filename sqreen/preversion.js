/**
 * Copyright (c) 2016 - 2019 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const Assert = require('assert');
const Pkg = require('./package.json');
const Version = require('./version.json');
const Semver = require('semver');

Assert(Semver.gt(Version.version, Pkg.version));
