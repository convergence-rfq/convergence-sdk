/* eslint-disable no-console */
import { PublicKey } from '@solana/web3.js';
import {
  SendAndConfirmTransactionResponse,
  BaseAsset,
  Rfq,
  Protocol,
  RegisteredMint,
} from '@convergence-rfq/sdk';

import {
  formatOrderType,
  formatState,
  formatSide,
  formatInstrument,
} from './helpers';
import { Instrument } from './types';

// NOTE: Improves readability of code by preserving terseness
const l = (...args: any[]) => console.log(...args);

// NOTE: Same
const N = Number;

export const logPk = (p: PublicKey): void => l('Address:', p.toString());

export const logTx = (t: string): void => l('Tx:', t);

export const logInstrument = (i: Instrument): void => {
  if (!i.legInfo) {
    throw new Error('Invalid instrument');
  }
  l('Instrument:', formatInstrument(i));
  l('Amount:', N(i?.legInfo?.amount.toString()));
  l('Side:', formatSide(i.legInfo.side));
  l('Decimals:', N(i.mint.decimals.toString()));
  l('Mint:', i.mint.address.toString());
};

export const logResponse = (r: SendAndConfirmTransactionResponse): void =>
  l('Tx:', r.signature);

export const logBaseAsset = (b: BaseAsset): void => {
  l('Address:', b.address.toString());
  l('Ticker:', b.ticker.toString());
  // TODO: Update SDK model
  //l('Active:', b.enabled);
  l('Index:', b.index.value);
  l('Oracle:', b.priceOracle.address.toString());
  l('Risk category:', parseInt(b.riskCategory.toString()));
};

export const logRegisteredMint = (r: RegisteredMint): void => {
  l('Address:', r.address.toString());
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
