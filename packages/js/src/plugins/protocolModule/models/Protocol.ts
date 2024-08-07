import { PublicKey } from '@solana/web3.js';
import {
  FeeParameters,
  Instrument,
  PrintTradeProvider,
} from '@convergence-rfq/rfq';

import { ProtocolAccount } from '../accounts';
import { assert } from '../../../utils/assert';
import { removeDecimals } from '@/utils/conversions';

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

  /** The authority of the protocol. */
  readonly authority: PublicKey;

  /** If the protocol is active. */
  readonly active: boolean;

  /** The settlement fees for the protocol. */
  readonly settleFees: FeeParameters;

  /** The default fees for the protocol */
  readonly defaultFees: FeeParameters;

  /** Sol fee to add a user asset */
  readonly assetAddFee: number;

  /** The address of the risk engine */
  readonly riskEngine: PublicKey;

  /** The address of the collateral mint. */
  readonly collateralMint: PublicKey;

  /** The procotol instruments. */
  readonly instruments: Instrument[];

  /** The procotol instruments. */
  readonly printTradeProviders: PrintTradeProvider[];
};

/** @group Model Helpers */
export const isProtocol = (value: any): value is Protocol =>
  typeof value === 'object' && value.model === 'protocol';

/** @group Model Helpers */
export function assertProtocol(value: any): asserts value is Protocol {
  assert(isProtocol(value), 'Expected Protocol model');
}

/** @group Model Helpers */
export const toProtocol = (account: ProtocolAccount): Protocol => ({
  model: 'protocol',
  address: account.publicKey,
  authority: account.data.authority,
  active: account.data.active,
  settleFees: account.data.settleFees,
  defaultFees: account.data.defaultFees,
  assetAddFee: removeDecimals(account.data.assetAddFee, 9),
  riskEngine: account.data.riskEngine,
  collateralMint: account.data.collateralMint,
  instruments: account.data.instruments,
  printTradeProviders: account.data.printTradeProviders,
});
