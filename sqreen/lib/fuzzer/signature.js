/**
 * Copyright (c) 2016 - 2020 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
// @ts-check
'use strict';

const Crypto = require('crypto');
const Assert = require('assert');

/**
 * @typedef {import('./reveal').Runtime} Runtime
 * @typedef {import('./reveal').RuntimeSignType} RuntimeSignType
 */

const PUBLIC_KEY_ECC = `-----BEGIN PUBLIC KEY-----
MFYwEAYHKoZIzj0CAQYFK4EEAAoDQgAEX0Vn8RT8N7zuI2a8SvoeQ4aAhBJX/xvI
bwkvYXaqv2vta5Edk4T7ge36XJNCwaojWwewxC+LsV9Ir9RIgXMfMg==
-----END PUBLIC KEY-----
`;

const SIGNTYPE = {
    RS256: 1,
    ES256: 2,
    HS256: 3
};

/**
 * @param {Runtime} runtime - A reveal runtime object.
 * @param {RuntimeSignType} [signType] - A signature type.
 * @returns {{payload: string, signature: string}}
 */
const getNormalizedPayloadAndSignature = module.exports._getNormalizedPayload = function (runtime, signType) {

    Assert(!!runtime.version, 'no runtime version');
    Assert(Array.isArray(runtime.signatures), `no signature in runtime version ${runtime.version}`);

    const sigs = runtime.signatures.filter((sig) => sig.type === signType);
    Assert(sigs.length > 0, `no signature found for type ${signType}`);

    const sig = sigs[0].value;
    Assert(!!sig && sig.length > 0, `no signature value for type ${signType}`);

    return {
        payload: runtime.code,
        signature: sig
    };
};

/**
 * @param {Runtime} runtime - A reveal runtime object.
 * @returns boolean - True if signature has been successfully verified.
 */
module.exports.verifyRuntimeSignature = function (runtime) {

    const runtimeData = getNormalizedPayloadAndSignature(runtime, SIGNTYPE.ES256);
    const payload = runtimeData.payload;

    const signature = Buffer.from(runtimeData.signature, 'hex');

    const verify = Crypto.createVerify('sha512');
    verify.update(payload);

    return verify.verify(PUBLIC_KEY_ECC, signature);
};
