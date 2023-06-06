import { AccountMeta } from '@solana/web3.js';

import { BaseAssetIndex, Leg, QuoteAsset, Side } from '@convergence-rfq/rfq';
import { PublicKey } from '../../../types';
import { Convergence } from '../../../Convergence';

export interface LegInstrumentParser {
  parseFromLeg(convergence: Convergence, leg: Leg): Promise<LegInstrument>;
}

/**
 * This model captures all the relevant information about an
 * instrument on the Solana blockchain.
 *
 * @group Models
 */
export interface LegInstrument {
  getProgramId: () => PublicKey;
  getBaseAssetIndex: () => BaseAssetIndex;
  getAmount: () => number;
  getDecimals: () => number;
  getSide: () => Side;
  serializeInstrumentData: () => Buffer;
  getValidationAccounts(): AccountMeta[];
}

export interface QuoteInstrumentFactory {
  parseFromQuote(
    convergence: Convergence,
    quote: QuoteAsset
  ): Promise<QuoteInstrument>;
}

export interface QuoteInstrument {
  getProgramId: () => PublicKey;
  getDecimals: () => number;
  serializeInstrumentData: () => Buffer;
  getValidationAccounts(): AccountMeta[];
}
