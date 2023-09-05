import { AccountMeta } from '@solana/web3.js';

import { BaseAssetIndex, Leg } from '@convergence-rfq/rfq';
import { PublicKey } from '../../types';
import { Convergence } from '../../Convergence';
import { LegSide } from '../rfqModule/models/LegSide';

export interface LegInstrumentParser {
  parseFromLeg(
    convergence: Convergence,
    leg: Leg,
    instrumentIndex: number
  ): LegInstrument;
}

export interface LegInstrument {
  legType: 'escrow';

  getInstrumentIndex: () => number;
  getProgramId: () => PublicKey;
  getBaseAssetIndex: () => BaseAssetIndex;
  getAssetMint: () => PublicKey;
  getAmount: () => number;
  getDecimals: () => number;
  getSide: () => LegSide;
  serializeInstrumentData: () => Buffer;
  getValidationAccounts(): Promise<AccountMeta[]>;
}

// TODO add registration of quote instruments
// export interface QuoteInstrumentFactory {
//   parseFromQuote(
//     convergence: Convergence,
//     quote: QuoteAsset
//   ): Promise<QuoteInstrument>;
// }

export interface QuoteInstrument {
  getInstrumentIndex: () => number;
  getProgramId: () => PublicKey;
  getDecimals: () => number;
  serializeInstrumentData: () => Buffer;
  getValidationAccounts(): AccountMeta[];
}
