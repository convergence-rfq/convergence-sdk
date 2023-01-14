import { Buffer } from 'buffer';
import { PublicKey } from '@solana/web3.js';
import { PROGRAM_ID, baseAssetInfoDiscriminator } from '@convergence-rfq/rfq';
import { Convergence } from '@/Convergence';
import { GpaBuilder } from '@/utils';

const BUMP = 8;
const INDEX = BUMP + 8;
const RISK_CATEGORY = INDEX + 8;
const PRICE_ORACLE = RISK_CATEGORY + 32;
const TICKER = PRICE_ORACLE + 32;

export class ProtocolGpaBuilder extends GpaBuilder {
  constructor(convergence: Convergence, programId?: PublicKey) {
    super(convergence, programId ?? PROGRAM_ID);
    this.where(0, Buffer.from(baseAssetInfoDiscriminator));
  }

  whereBaseAssets() {
    return this;
  }

  whereTicker(ticker: string) {
    return this.where(TICKER, Buffer.from(ticker));
  }
}