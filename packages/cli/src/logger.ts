/* eslint-disable no-console */
import { PublicKey } from '@solana/web3.js';
import {
  SendAndConfirmTransactionResponse,
  BaseAsset,
  Rfq,
  Protocol,
} from '@convergence-rfq/sdk';

import { formatOrderType, formatState } from './helpers';

// NOTE: Improves readability of code
const l = (x: any, y?: any) => console.log(x, y);

// NOTE: Improves readability of code
const N = Number;

export const logAddress = (p: PublicKey): void => {
  l('Address:', p.toString());
};

export const logResponse = (r: SendAndConfirmTransactionResponse): void => {
  l('Tx:', r.signature);
};

export const logBaseAsset = (b: BaseAsset): void => {
  l('Address:', b.address.toString());
  l('Index:', b.index.value);
  l('Ticker:', b.ticker.toString());
  l('Oracle:', b.priceOracle.address.toString());
  l('Risk category:', parseInt(b.riskCategory.toString()));
};

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
  p.instruments.map((i: any) => logProtocolInstrument(i));
};

export const logTx = (t: string): void => {
  l('Tx:', t);
};

export const logLeg = (l: any): void => {
  l('Leg:', JSON.stringify(l));
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
  l('Annualized 30 day volatility:', c.annualized30DayVolatility);
  l('Scenario per settlement period (base asset price/volatility):', s);
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
  l('Order type:', formatOrderType(r.orderType));
  l('Size:', r.fixedSize.__kind === 'None' ? 'open' : 'fixed');
  l('Quote asset:', r.quoteMint.toString());
  l('Created:', new Date(created).toString());
  l(`Active window: ${r.activeWindow} seconds`);
  l(`Settlement window: ${r.settlingWindow} seconds`);
  l('Legs:', r.legs.length);
  l('State:', formatState(r.state));
  l('Total responses:', r.totalResponses);
  l('Confirmed responses:', r.confirmedResponses);
  l('Cleared responses:', r.clearedResponses);
};
