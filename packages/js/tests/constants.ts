import { PublicKey } from '@solana/web3.js';

import { Ctx } from '../../validator';

// For terseness
const P = PublicKey;

// This comes from the CPL fixtures used in validator
export const CTX = new Ctx();

export const COLLATERAL_MINT_DECIMALS = 9;
export const QUOTE_MINT_DECIMALS = 9;
export const BASE_MINT_BTC_PK = new P(CTX.baseMintBTC);
export const BASE_MINT_SOL_PK = new P(CTX.baseMintSOL);
export const QUOTE_MINT_PK = new P(CTX.quoteMint);
export const TAKER_PK = new P(CTX.taker);
