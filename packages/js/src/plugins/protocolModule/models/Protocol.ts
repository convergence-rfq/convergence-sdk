import { PublicKey } from '@solana/web3.js';
import { ProtocolAccount } from '../accounts';
import { assert } from '@/utils';

/**
 * This model captures all the relevant information about an RFQ
 * on the Solana blockchain. That includes the Rfq's leg accounts.
 *
 * @group Models
 */
export type Protocol = {
  /** A model identifier to distinguish models in the SDK. */
  readonly model: 'protocol';

  /** The address of the protocol. */
  readonly address: PublicKey;

  /** The address of the collateral mint. */
  readonly collateralMint: PublicKey;
};

/** @group Model Helpers */
export const isProtocol = (value: any): value is Protocol =>
  typeof value === 'object' && value.model === 'protocol';

/** @group Model Helpers */
export function assertProtocol(value: any): asserts value is Protocol {
  assert(isProtocol(value), `Expected Protocol model`);
}

/** @group Model Helpers */
export const toProtocol = (account: ProtocolAccount): Protocol => ({
  model: 'protocol',
  address: account.publicKey,
  collateralMint: account.data.collateralMint,
});
