import {
  isFixedSizeBaseAsset,
  isFixedSizeNone,
  isFixedSizeQuoteAsset,
  isQuoteFixedSize,
  isQuoteStandard,
  Quote as SolitaQuote,
} from '@convergence-rfq/rfq';
import BN from 'bn.js';

import { AccountMeta, PublicKey } from '@solana/web3.js';
import {
  ABSOLUTE_PRICE_DECIMALS,
  LEG_MULTIPLIER_DECIMALS,
} from '../rfqModule/constants';
import { Rfq, toSolitaFixedSize } from '../rfqModule/models';
import { LegInstrument } from '../instrumentModule';
import { PrintTradeLeg } from '../printTradeModule';
import { toPriceOracle } from '../protocolModule';
import { removeDecimals } from '@/utils/conversions';
import { Convergence } from '@/Convergence';

export function extractLegsMultiplier(rfq: Rfq, quote: SolitaQuote) {
  const fixedSize = toSolitaFixedSize(rfq.size, rfq.quoteAsset.getDecimals());

  if (isFixedSizeNone(fixedSize)) {
    if (isQuoteFixedSize(quote)) {
      throw Error('Fixed size quote cannot be provided to non-fixed size rfq');
    }

    return removeDecimals(quote.legsMultiplierBps, LEG_MULTIPLIER_DECIMALS);
  } else if (isFixedSizeBaseAsset(fixedSize)) {
    if (isQuoteStandard(quote)) {
      throw Error('Non fixed size quote cannot be provided to fixed size rfq');
    }

    return removeDecimals(fixedSize.legsMultiplierBps, LEG_MULTIPLIER_DECIMALS);
  } else if (isFixedSizeQuoteAsset(fixedSize)) {
    if (isQuoteStandard(quote)) {
      throw Error('Non fixed size quote cannot be provided to fixed size rfq');
    }

    const priceBps = new BN(quote.priceQuote.amountBps);
    if (priceBps.ltn(0)) {
      throw Error('Negative prices are not allowed for fixed quote amount rfq');
    }

    // Note that the leg multiplier and absolute price decimals are hardcoded in the
    // protocol. The number is currently 9 which is somewhat arbitrary.
    const legsMultiplierBps = new BN(fixedSize.quoteAmount)
      .mul(
        new BN(10).pow(
          new BN(LEG_MULTIPLIER_DECIMALS + ABSOLUTE_PRICE_DECIMALS)
        )
      )
      .div(priceBps);

    return removeDecimals(legsMultiplierBps, LEG_MULTIPLIER_DECIMALS);
  }

  throw new Error('Invalid fixed size');
}

export async function getRiskEngineAccounts(
  cvg: Convergence,
  legs: LegInstrument[] | PrintTradeLeg[]
): Promise<AccountMeta[]> {
  const configAddress = cvg.riskEngine().pdas().config();

  const baseAssetIndexSet: Set<number> = new Set(
    legs.map((leg) => leg.getBaseAssetIndex().value)
  );
  const uniqueBaseAssetIndexes = Array.from(baseAssetIndexSet);

  const baseAssetAddresses = uniqueBaseAssetIndexes.map((value) =>
    cvg.protocol().pdas().baseAsset({ index: value })
  );

  const oracleInfos = await Promise.all(
    baseAssetAddresses.map(async (baseAsset) =>
      cvg.protocol().findBaseAssetByAddress({ address: baseAsset })
    )
  );
  const oracleAddresses = oracleInfos
    .map((oracleInfo) => toPriceOracle(oracleInfo).address)
    .filter((address): address is PublicKey => address !== undefined);

  const allAddresses = [
    configAddress,
    ...baseAssetAddresses,
    ...oracleAddresses,
  ];

  return allAddresses.map((address) => ({
    pubkey: address,
    isSigner: false,
    isWritable: false,
  }));
}
