import { PublicKey } from '@solana/web3.js';
import { PsyoptionsEuropeanInstrumentAccount } from '../accounts';
import { assert } from '@/utils';

/**
 * This model captures all the relevant information about a Psyoptions European
 * instrument on the Solana blockchain.
 *
 * @group Models
 */
export type PsyoptionsEuropeanInstrument = {
  /** A model identifier to distinguish models in the SDK. */
  readonly model: 'psyoptionsEuropeanInstrument';

  /** The address of the instrument. */
  readonly address: PublicKey;

  //readonly meta: PublicKey;

  //readonly metaKey: PublicKey;

  readonly underlyingMint: PublicKey;

  readonly stableMint: PublicKey;

  //readonly callMint: PublicKey;

  readonly callWriterMint: PublicKey;

  //readonly putMint: PublicKey;

  //readonly putWriterMint: PublicKey;
};

/** @group Model Helpers */
export const isProtocol = (value: any): value is PsyoptionsEuropeanInstrument =>
  typeof value === 'object' && value.model === 'psyoptionsEuropeanInstrument';

/** @group Model Helpers */
export function assertProtocol(
  value: any
): asserts value is PsyoptionsEuropeanInstrument {
  assert(isProtocol(value), `Expected PsyoptionsEuropeanInstrument model`);
}

/** @group Model Helpers */
export const toProtocol = (
  account: PsyoptionsEuropeanInstrumentAccount
): PsyoptionsEuropeanInstrument => ({
  model: 'psyoptionsEuropeanInstrument',
  address: account.publicKey,
  //meta: account.data.meta,
  //metaKey: account.data.metaKey,
  underlyingMint: account.data.underlyingMint,
  stableMint: account.data.stableMint,
  //callMint: account.data.callMint,
  callWriterMint: account.data.callWriterMint,
  //putMint: account.data.putMint,
  //putWriterMint: account.data.putwriterMint,
});
