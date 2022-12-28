import { Side } from '@convergence-rfq/rfq';
import { AccountMeta } from '@solana/web3.js';
import type { Convergence } from '@/Convergence';
import { PublicKey, BigNumber } from '@/types';
import { assert } from '@/utils';

export interface InstrumentData {
  instrument: PublicKey;
  instrumentData: Buffer | Uint8Array;
  instrumentAmount: BigNumber;
  side: Side;
}

/**
 * This model captures all the relevant information about an
 * instrument on the Solana blockchain.
 *
 * @group Models
 */
export interface Instrument {
  readonly convergence: Convergence;

  serializeInstrumentData: () => Buffer;

  getProgramId: () => PublicKey;

  getValidationAccounts(): Promise<AccountMeta[]>;

  //getPrepareSettlementAccounts(side: Side): Promise<AccountMeta[]>;

  //getSettleAccounts(assetReceiver: PublicKey): Promise<AccountMeta[]>;

  //getRevertSettlementPreparationAccounts(side: Side): Promise<AccountMeta[]>;

  //getCleanUpAccounts(): Promise<AccountMeta[]>;
}

/** @group Model Helpers */
export const isInstrument = (value: any): value is Instrument =>
  typeof value === 'object' && value.model === 'instrument';

/** @group Model Helpers */
export function assertInstrument(value: any): asserts value is Instrument {
  assert(isInstrument(value), `Expected Instrument model`);
}
