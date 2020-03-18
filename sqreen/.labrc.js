'use strict';
const Semver = require('semver');
const Os = require('os');

module.exports = {
    lint: true,
    assert: 'code',
    rejections: true
};

if (Semver.satisfies(process.version, '> 8.0.0') && Os.platform() !== 'win32') {
    module.exports.coverage = true;
    module.exports.threshold = 100;
}
