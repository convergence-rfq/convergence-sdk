import { AccountMeta } from '@solana/web3.js';

import { BaseAssetIndex, Leg } from '@convergence-rfq/rfq';
import { PublicKey } from '../../types';
import { Convergence } from '../../Convergence';
import { LegSide } from '../rfqModule/models/LegSide';
import { TransactionBuilder } from '@/utils/TransactionBuilder';
import { InstructionUniquenessTracker } from '@/utils/classes';

export interface LegInstrumentParser {
  parseFromLeg(convergence: Convergence, leg: Leg): LegInstrument;
}

export type CreateOptionInstrumentsResult = TransactionBuilder | null;

export interface LegInstrument {
  getProgramId: () => PublicKey;
  getBaseAssetIndex: () => BaseAssetIndex;
  getAmount: () => number;
  getDecimals: () => number;
  getSide: () => LegSide;
  serializeInstrumentData: () => Buffer;
  getValidationAccounts(): Promise<AccountMeta[]>;
  getPreparationsBeforeRfqCreation(
    ixTracker: InstructionUniquenessTracker
  ): Promise<CreateOptionInstrumentsResult>;
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
