/**
 * Copyright (c) 2016 - 2020 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
import {IncomingMessage} from 'http';
import {FuzzerRequest} from './request';

export interface FuzzerIncomingMessage extends IncomingMessage {
    __sqreen_replayed: boolean;
    __sqreen_fuzzerrequest: FuzzerRequest;
}
