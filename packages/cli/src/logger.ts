/* eslint-disable no-console */
import { PublicKey } from '@solana/web3.js';
import {
  SendAndConfirmTransactionResponse,
  BaseAsset,
  Rfq,
  Protocol,
  RegisteredMint,
  Collateral,
  Token,
  Mint,
  LegInstrument,
  SpotLegInstrument,
  PsyoptionsAmericanInstrument,
  PsyoptionsEuropeanInstrument,
} from '@convergence-rfq/sdk';

import { formatSide, formatInstrument, assertInstrument } from './helpers';

// Improves readability of code by preserving terseness
const l = (...args: any[]) => console.log(...args);

// See above
const N = Number;

export const logPk = (p: PublicKey): void => l('Address:', p.toString());

export const logTx = (t: string): void => l('Tx:', t);

export const logInstrument = (i: LegInstrument): void => {
  assertInstrument(i);
  l('Instrument:', formatInstrument(i));
  l('Amount:', N(i?.getAmount().toString()));
  l('Side:', formatSide(i.getSide()));
  if (i instanceof SpotLegInstrument) {
    l('Decimals:', N(i?.decimals.toString()));
    l('Mint:', i.mintAddress.toString());
  } else if (i instanceof PsyoptionsAmericanInstrument) {
    l('Decimals:', N(PsyoptionsAmericanInstrument.decimals.toString()));
  } else if (i instanceof PsyoptionsEuropeanInstrument) {
    l('Decimals:', N(PsyoptionsEuropeanInstrument.decimals.toString()));
  }
};

export const logResponse = (r: SendAndConfirmTransactionResponse): void =>
  l('Tx:', r.signature);

export const logBaseAsset = (b: BaseAsset): void => {
  l('Address:', b.address.toString());
  l('Ticker:', b.ticker.toString());
  l('Enabled:', b.enabled);
  l('Index:', b.index);
  l('Risk category:', b.riskCategory);
  l('Oracle source:', b.priceOracle.source);
  if (b.priceOracle.address) {
    l('Oracle address:', b.priceOracle.address.toString());
  } else if (b.priceOracle.price) {
    l('Oracle price:', b.priceOracle.price.toString());
  }
};

export const logRegisteredMint = (r: RegisteredMint): void => {
  l('Address:', r.address.toString());
};

export const logCollateral = (c: Collateral): void => {
  l('Address:', c.address.toString());
  l('User:', c.user.toString());
  l('Locked tokens:', N(c.lockedTokensAmount.toString()));
};

export const logToken = (t: Token): void => {
  l('Address:', t.address.toString());
  l('Owner:', t.ownerAddress.toString());
  l('Mint:', t.mintAddress.toString());
  l('Amount:', N(t.amount.basisPoints.toString()));
  l('Decimals:', t.amount.currency.decimals.toString());
};

export const logMint = (m: Mint): void => {
  l('Address:', m.address.toString());
  l('Owner:', m.mintAuthorityAddress?.toString());
  l('Supply:', N(m.supply.toString()));
  l('Decimals:', m.currency.decimals.toString());
};

export const logTokenAccount = (p: PublicKey): void => {
  l('Token account address:', p.toString());
};

export const logError = (e: any) => l(`Error: ${JSON.stringify(e.message)}`);

export const logProtocol = (p: Protocol): void => {
  l('Address:', p.address.toString());
  l('Authority:', p.authority.toString());
  l('Active:', p.active);
  l('Risk engine:', p.riskEngine.toString());
  l('Collateral mint:', p.collateralMint.toString());
  l(`Taker fee: ${p.settleFees.takerBps.toString()} bps`);
  l(`Maker fee: ${p.settleFees.makerBps.toString()} bps`);
  l(`Taker default fee: ${p.defaultFees.takerBps.toString()} bps`);
  l(`Maker default fee: ${p.defaultFees.makerBps.toString()} bps`);
  p.instruments.map(logProtocolInstrument);
};

export const logRiskEngineConfig = (r: any): void => {
  l('Address:', r.address.toString());
  l(
    'Collateral for variable size RFQ creation:',
    N(r.collateralForVariableSizeRfqCreation.toString())
  );
  l(
    'Collateral for fixed quote amount RFQ creation:',
    N(r.collateralForFixedQuoteAmountRfqCreation.toString())
  );
  l('Collateral mint decimals:', N(r.collateralMintDecimals.toString()));
  l('Safety price shift factor:', N(r.safetyPriceShiftFactor.toString()));
  l('Overall safety factor:', r.overallSafetyFactor);
  r.riskCategoriesInfo.map(logRiskCategoryInfo);
};

export const logRiskCategoryInfo = (c: any): void => {
  const formatRatio = (x: any) => {
    return [x.baseAssetPriceChange, x.volatilityChange].join('/');
  };
  const s = c.scenarioPerSettlementPeriod.map(formatRatio).join(', ');
  l('Interest rate:', c.interestRate);
  l('Annualized 30 day vol:', c.annualized30DayVolatility);
  l('Settlement period scenarios (price Δ/vol Δ):', s);
};

export const logProtocolInstrument = (i: any): void => {
  l('Instrument:', i.programKey.toString());
  l('Enabled:', i.enabled);
  l('Can be used as quote:', i.canBeUsedAsQuote);
  l('Validate data accounts:', i.validateDataAccountAmount);
  l('Prepare to settle accounts:', i.prepareToSettleAccountAmount);
  l('Settle accounts:', i.settleAccountAmount);
  l('Revert preparation accounts:', i.revertPreparationAccountAmount);
  l('Clean up accounts:', i.cleanUpAccountAmount);
};

export const logRfq = (r: Rfq) => {
  const created = parseInt(r.creationTimestamp.toString()) * 1_000;
  l('Address:', r.address.toString());
  l('Taker:', r.taker.toString());
  l('Order type:', r.orderType);
  l('Size:', r.size.type === 'open' ? 'open' : 'fixed');
  l('Quote asset:', r.quoteMint.toString());
  l('Created:', new Date(created).toString());
  l(`Active window: ${r.activeWindow} seconds`);
  l(`Settlement window: ${r.settlingWindow} seconds`);
  l('Legs:', r.legs.length);
  l('State:', r.state);
  l('Total responses:', r.totalResponses);
  l('Confirmed responses:', r.confirmedResponses);
  l('Cleared responses:', r.clearedResponses);
};
