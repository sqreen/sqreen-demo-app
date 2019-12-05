/**
 * Copyright (c) 2019 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
import {LeveledLogMethod, LoggerInstance} from 'winston';

export interface SqreenLogger extends LoggerInstance {
    FATAL: LeveledLogMethod;
    ERROR: LeveledLogMethod;
    WARN: LeveledLogMethod;
    INFO: LeveledLogMethod;
    DEBUG: LeveledLogMethod;
}
