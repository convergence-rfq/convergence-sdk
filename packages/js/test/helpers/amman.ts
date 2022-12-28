import { Amman } from '@metaplex-foundation/amman-client';
import { cusper as cusperTokenMetadata } from '@metaplex-foundation/mpl-token-metadata';
import { TransactionError } from '@solana/web3.js';
//import { logDebug } from '../../src/utils/log';

export const amman = Amman.instance({
  //log: logDebug,
});

type TransactionInstructionError = {
  InstructionError: [number, { Custom: number }];
};

function isTransactionInstructionError(
  error: TransactionError | TransactionInstructionError
): error is TransactionInstructionError {
  return (error as TransactionInstructionError).InstructionError != null;
}

export function errorCode(err: TransactionError | TransactionInstructionError) {
  if (isTransactionInstructionError(err)) {
    return err.InstructionError[1].Custom;
  }
}

export function resolveTransactionError(
  cusper: typeof cusperTokenMetadata,
  err: TransactionError | TransactionInstructionError
) {
  const code = errorCode(err);
  if (code == null) {
    return new Error(`Unknown error ${err}`);
  }
  const cusperError = cusper.errorFromCode(code);
  if (cusperError == null) {
    return new Error(`Unknown error ${err} with code ${code}`);
  }

  return cusperError;
}

export function maybeThrowError(
  cusper: typeof cusperTokenMetadata,
  err: TransactionError | TransactionInstructionError | null | undefined
) {
  if (err == null) return;
  throw resolveTransactionError(cusper, err);
}
