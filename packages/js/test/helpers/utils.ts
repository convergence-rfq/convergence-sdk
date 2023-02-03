import { ConfirmOptions } from '@solana/web3.js';
import test from 'tape';
// import { Rfq, Response } from '@/plugins';

/**
 * This is a workaround the fact that web3.js doesn't close it's socket connection and provides no way to do so.
 * Therefore the process hangs for a considerable time after the tests finish, increasing the feedback loop.
 *
 * This fixes this by exiting the process as soon as all tests are finished.
 */
export function killStuckProcess() {
  // Don't do this in CI since we need to ensure we get a non-zero exit code if tests fail
  if (process.env.CI == null) {
    test.onFinish(() => process.exit(0));
  }
}

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const SKIP_PREFLIGHT: ConfirmOptions = {
  skipPreflight: true,
  commitment: 'confirmed',
};

// TODO: this should only return one value as we can only confirm one side of the response
// export function getResponseBaseAssetAmounts(
//   rfq: Rfq,
//   rfqResponse: Response
// ): number[] {
//   let rfqAssetAmount = -1;

//   if (rfq.fixedSize.__kind == 'QuoteAsset') {
//     rfqAssetAmount = parseInt(rfq.fixedSize.quoteAmount.toString());
//   } else if (rfq.fixedSize.__kind == 'BaseAsset') {
//     rfqAssetAmount = parseInt(rfq.fixedSize.legsMultiplierBps.toString());
//   } else if (rfq.fixedSize.__kind == 'None') {
//     //we need to extract the quote from the Confirmation in this case
//   }

//   const responseBidAmountBps = rfqResponse.bid
//     ? parseInt(rfqResponse.bid.priceQuote.amountBps.toString())
//     : null;

//   const responseAskAmountBps = rfqResponse.ask
//     ? parseInt(rfqResponse.ask.priceQuote.amountBps.toString())
//     : null;

//   const baseAssetAmounts: number[] = [];

//   if (responseBidAmountBps) {
//     baseAssetAmounts.push(rfqAssetAmount / responseBidAmountBps / 100);
//   }
//   if (responseAskAmountBps) {
//     baseAssetAmounts.push(rfqAssetAmount / responseAskAmountBps / 100);
//   }

//   return baseAssetAmounts;
// }
