import { PublicKey } from '@solana/web3.js';

import { Ctx } from '../../validator';

// For terseness
const P = PublicKey;

// This comes from the CPL fixtures used in validator
export const CTX = new Ctx();

export const BASE_MINT_DECIMALS = 9;
export const COLLATERAL_MINT_DECIMALS = 9;
export const BASE_MINT_PK = new P(CTX.baseMint);
export const QUOTE_MINT_PK = new P(CTX.quoteMint);
export const COLLATERAL_MINT_PK = new P(CTX.collateralMint);
export const TAKER_PK = new P(CTX.taker);
export const TAKER_COLLATERAL_TOKEN_PK = new P(CTX.takerCollateralToken);
export const TAKER_COLLATERAL_INFO_PK = new P(CTX.takerCollateralInfo);
export const TAKER_QUOTE_WALLET_PK = new P(CTX.takerQuoteWallet);
export const SWITCHBOARD_BTC_ORACLE_PK = new P(CTX.switchboardBTCOracle);
export const SWITCHBOARD_SOL_ORACLE_PK = new P(CTX.switchboardSOLOracle);
