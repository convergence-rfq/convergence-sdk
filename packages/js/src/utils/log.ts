/* eslint-disable no-console */
import debug from 'debug';

export const logErrorDebug = debug('crfq-sdk:error');
export const logInfoDebug = debug('crfq-sdk:info');
export const logDebug = debug('crfq-sdk:debug');
export const logTrace = debug('crfq-sdk:trace');

export const logError = logErrorDebug.enabled
  ? logErrorDebug
  : console.error.bind(console);
export const logInfo = logInfoDebug.enabled
  ? logInfoDebug
  : console.log.bind(console);
