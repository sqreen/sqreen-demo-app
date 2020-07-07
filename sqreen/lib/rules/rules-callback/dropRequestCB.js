/**
 * Copyright (c) 2016 - 2020 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const CB_STATUS = require('../../enums/cbReturn').STATUS;
const TYPES = {
    custom_error_page: 'custom_error_page',
    redirection: 'redirection'
};
const SQREEN_PAGE = `<!-- Sorry, you’ve been blocked --><!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>You've been blocked</title><style>a,body,div,h1,html,span{margin:0;padding:0;border:0;font-size:100%;font:inherit;vertical-align:baseline}body{background:-webkit-radial-gradient(26% 19%,circle,#fff,#f4f7f9);background:radial-gradient(circle at 26% 19%,#fff,#f4f7f9);display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-pack:center;-ms-flex-pack:center;justify-content:center;-webkit-box-align:center;-ms-flex-align:center;align-items:center;-ms-flex-line-pack:center;align-content:center;width:100%;min-height:100vh;line-height:1;flex-direction:column}h1,p,svg{display:block}svg{margin:0 auto 4vh}main{text-align:center;flex:1;display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-pack:center;-ms-flex-pack:center;justify-content:center;-webkit-box-align:center;-ms-flex-align:center;align-items:center;-ms-flex-line-pack:center;align-content:center;flex-direction:column}h1{font-family:sans-serif;font-weight:600;font-size:34px;color:#1e0936;line-height:1.2}p{font-size:18px;line-height:normal;color:#646464;font-family:sans-serif;font-weight:400}a{color:#4842b7}footer{width:100%;text-align:center}footer p{font-size:16px}</style></head><body><main><svg width="170px" height="193px" viewBox="0 0 170 193" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true"><g id="exports" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd"><g id="Artboard" transform="translate(-186.000000, -189.000000)"><g id="logo-cmyk-indigo" transform="translate(186.000000, 189.000000)"><g id="nest-cmyk-indigo"><ellipse id="sqreen" fill="#B0ACFF" cx="85" cy="96.5" rx="45.7692308" ry="45.7966102"></ellipse><path d="M78.4615385,175.749389 L78.4615385,102.2092 L13.1398162,64.4731256 L13.1398162,129.181112 L36.352167,115.771438 C37.9764468,119.873152 40.1038639,123.720553 42.6582364,127.237412 L18.5723996,141.151695 L78.4615385,175.749389 Z M91.5384615,175.749389 L151.4276,141.151695 L127.341764,127.237412 C129.896136,123.720553 132.023553,119.873152 133.647833,115.771438 L156.860184,129.181112 L156.860184,64.4731256 L91.5384615,102.2092 L91.5384615,175.749389 Z M18.0061522,52.1754237 L85,90.8774777 L151.993848,52.1754237 L91.5384615,17.2506105 L91.5384615,44.565949 C89.3964992,44.2986903 87.2143177,44.1610169 85,44.1610169 C82.7856823,44.1610169 80.6035008,44.2986903 78.4615385,44.565949 L78.4615385,17.2506105 L18.0061522,52.1754237 Z M90.8846156,1.76392358 L164.052491,44.0326866 C167.693904,46.1363149 169.937107,50.0239804 169.937107,54.231237 L169.937107,138.768763 C169.937107,142.97602 167.693904,146.863685 164.052491,148.967313 L90.8846156,191.236076 C87.2432028,193.339705 82.7567972,193.339705 79.1153844,191.236076 L5.94750871,148.967313 C2.30609589,146.863685 0.0628930904,142.97602 0.0628930904,138.768763 L0.0628930904,54.231237 C0.0628930904,50.0239804 2.30609589,46.1363149 5.94750871,44.0326866 L79.1153844,1.76392358 C82.7567972,-0.339704735 87.2432028,-0.339704735 90.8846156,1.76392358 Z" id="app" fill="#4842B7"></path></g></g></g></g></svg><h1>Sorry, you've been blocked</h1><p>Contact the website owner</p></main><footer><p>Security provided by <a href="https://www.sqreen.com/?utm_medium=block_page" target="_blank">Sqreen</a></p></footer></body></html>`; // eslint-disable-line

module.exports.getCbs = function (rule) {

    if (!rule || !rule.data || !rule.data.values || rule.data.values.length === 0) {
        return null;
    }

    const value = rule.data.values[0];
    const type = TYPES[value.type];

    if (!type) {
        throw new Error('unknown type ' + value.type + ' in DropRequestCB');
    }

    if (type === TYPES.redirection && !value.redirection_url) {
        throw new Error('redirection without target');
    }

    const pre = function (argus) {

        const args = argus[0];

        if (args[2].finished) {
            return null;
        }

        if (type === TYPES.custom_error_page) {

            args[2].writeHead(value.status_code || 500);
            args[2].write(SQREEN_PAGE);
        }
        else {

            args[2].writeHead(303, {
                Location: value.redirection_url
            });
        }

        if (args[2].__original_end) {
            args[2].__original_end();
        }
        else {
            args[2].end(); // respond with a 500 error
        }

        return { status: CB_STATUS.SKIP };
    };

    pre.noBudget = true;

    return { pre };
};
