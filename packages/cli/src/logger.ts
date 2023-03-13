/* eslint-disable no-console */
import { PublicKey } from '@solana/web3.js';
import {
  SendAndConfirmTransactionResponse,
  BaseAsset,
  Rfq,
  Protocol,
} from '@convergence-rfq/sdk';

import { formatOrderType, formatState } from './helpers';

export const logAddress = (p: PublicKey): void => {
  console.log('Address:', p.toString());
};

export const logResponse = (r: SendAndConfirmTransactionResponse): void => {
  console.log('Tx:', r.signature);
};

export const logBaseAsset = (b: BaseAsset): void => {
  console.log('Address:', b.address.toString());
  console.log('Index:', b.index.value);
  console.log('Ticker:', b.ticker.toString());
  console.log('Oracle:', b.priceOracle.address.toString());
  console.log('Risk category:', parseInt(b.riskCategory.toString()));
};

export const logProtocol = (p: Protocol): void => {
  console.log('Address:', p.address.toString());
  console.log('Authority:', p.authority.toString());
  console.log('Active:', p.active);
  console.log('Risk engine:', p.riskEngine.toString());
  console.log('Collateral mint:', p.collateralMint.toString());
  console.log(`Taker fee: ${p.settleFees.takerBps.toString()} bps`);
  console.log(`Maker fee: ${p.settleFees.makerBps.toString()} bps`);
  console.log(`Taker default fee: ${p.defaultFees.takerBps.toString()} bps`);
  console.log(`Maker default fee: ${p.defaultFees.makerBps.toString()} bps`);
  p.instruments.map((i: any) => logProtocolInstrument(i));
};

export const logTx = (t: string): void => {
  console.log('Tx:', t);
};

export const logLeg = (l: any): void => {
  console.log('Leg:', JSON.stringify(l));
};

export const logRiskEngineConfig = (r: any): void => {
  console.log('Address:', r.address.toString());
  console.log(
    'Collateral for variable size RFQ creation:',
    Number(r.collateralForVariableSizeRfqCreation.toString())
  );
  console.log(
    'Collateral for fixed quote amount RFQ creation:',
    Number(r.collateralForFixedQuoteAmountRfqCreation.toString())
  );
  console.log(
    'Collateral mint decimals:',
    Number(r.collateralMintDecimals.toString())
  );
  console.log(
    'Safety price shift factor:',
    Number(r.safetyPriceShiftFactor.toString())
  );
  console.log('Overall safety factor:', r.overallSafetyFactor);
  r.riskCategoriesInfo.map((c: any) => {
    console.log('Interest rate:', c.interestRate);
    console.log('Annualized 30 day volatility:', c.annualized30DayVolatility);
    console.log(
      `Scenario per settlement period (base asset price Δ/volatility Δ): ${c.scenarioPerSettlementPeriod
        .map((x: any) => {
          return [x.baseAssetPriceChange, x.volatilityChange].join('/');
        })
        .join(', ')}`
    );
  });
};

export const logProtocolInstrument = (i: any): void => {
  console.log('Instrument:', i.programKey.toString());
  console.log('Enabled:', i.enabled);
  console.log('Can be used as quote:', i.canBeUsedAsQuote);
  console.log('Validate data accounts:', i.validateDataAccountAmount);
  console.log('Prepare to settle accounts:', i.prepareToSettleAccountAmount);
  console.log('Settle accounts:', i.settleAccountAmount);
  console.log('Revert preparation accounts:', i.revertPreparationAccountAmount);
  console.log('Clean up accounts:', i.cleanUpAccountAmount);
};

export const logRfq = (r: Rfq) => {
  const created = parseInt(r.creationTimestamp.toString()) * 1_000;
  console.log('Address:', r.address.toString());
  console.log('Taker:', r.taker.toString());
  console.log('Order type:', formatOrderType(r.orderType));
  console.log('Size:', r.fixedSize.__kind === 'None' ? 'open' : 'fixed');
  console.log('Quote asset:', r.quoteMint.toString());
  console.log('Created:', new Date(created).toString());
  console.log(`Active window: ${r.activeWindow} seconds`);
  console.log(`Settlement window: ${r.settlingWindow} seconds`);
  console.log('Legs:', r.legs.length);
  console.log('State:', formatState(r.state));
  console.log('Total responses:', r.totalResponses);
  console.log('Confirmed responses:', r.confirmedResponses);
  console.log('Cleared responses:', r.clearedResponses);
};
