import { AccountMeta } from '@solana/web3.js';

import { BaseAssetIndex, Leg } from '@convergence-rfq/rfq';
import { PublicKey } from '../../types';
import { Convergence } from '../../Convergence';
import { ResponseSide } from "../rfqModule/models/ResponseSide";

export interface LegInstrumentParser {
  parseFromLeg(convergence: Convergence, leg: Leg): LegInstrument;
}

export interface LegInstrument {
  getProgramId: () => PublicKey;
  getBaseAssetIndex: () => BaseAssetIndex;
  getAmount: () => number;
  getDecimals: () => number;
  getSide: () => ResponseSide;
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
  getProgramId: () => PublicKey;
  getDecimals: () => number;
  serializeInstrumentData: () => Buffer;
  getValidationAccounts(): AccountMeta[];
}
