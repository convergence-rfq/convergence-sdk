import { AccountMeta, TransactionInstruction } from '@solana/web3.js';

import { BaseAssetIndex, Leg } from '@convergence-rfq/rfq';
import { PublicKey } from '../../types';
import { Convergence } from '../../Convergence';
import { LegSide } from '../rfqModule/models/LegSide';

export interface LegInstrumentParser {
  parseFromLeg(convergence: Convergence, leg: Leg): LegInstrument;
}

export type CreateOptionInstrumentsResult = TransactionInstruction[];

export interface LegInstrument {
  getProgramId: () => PublicKey;
  getBaseAssetIndex: () => BaseAssetIndex;
  getAmount: () => number;
  getDecimals: () => number;
  getSide: () => LegSide;
  serializeInstrumentData: () => Buffer;
  getBaseAssetMint(): PublicKey;
  getBaseAssetAccount(): AccountMeta;
  getOracleAccount(): Promise<AccountMeta>;
  getValidationAccounts(): AccountMeta[];
  getPreparationsBeforeRfqCreation(): Promise<CreateOptionInstrumentsResult>;
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
