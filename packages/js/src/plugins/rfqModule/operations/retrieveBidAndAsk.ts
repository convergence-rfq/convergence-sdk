import { Quote, Rfq } from '../models';
import { Operation, SyncOperationHandler, useOperation } from '../../../types';
import { FixedSize } from '../models/FixedSize';
import { roundDown } from '@/utils';
const Key = 'RetrieveBidAndAsk' as const;
/**
 * retrieveBidAndAsk.
 *
 * ```ts
 * const result = await convergence.rfqs().retrieveBidAndAsk({
 * rfq,
 * ask: {
 * price: 1,
 * legsMultiplier: 1
 * },
 * bid: {
 * price: 1,
 * legsMultiplier: 1
 * }
 * });
 *
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const retrieveBidAndAskOperation = useOperation<RetrieveBidAndAsk>(Key);

/**
 * @group Operations
 * @category Types
 */
export type RetrieveBidAndAsk = Operation<
  typeof Key,
  RetrieveBidAndAskInput,
  RetrieveBidAndAskOutput
>;

/**
 * @group Operations
 * @category Inputs
 */

export type RetrieveBidAndAskInput = {
  rfq: Rfq;
  ask?: {
    price?: number;
    legsMultiplier?: number;
  };
  bid?: {
    price?: number;
    legsMultiplier?: number;
  };
};

/**
 * @group Operations
 * @category Outputs
 */
export type RetrieveBidAndAskOutput = {
  calculatedAsk: Quote | null;
  calculatedBid: Quote | null;
};

/**
 * @group Operations
 * @category Handlers
 */
export const retrieveBidAndAskHandler: SyncOperationHandler<RetrieveBidAndAsk> =
  {
    handle: (operation: RetrieveBidAndAsk): RetrieveBidAndAskOutput => {
      const { rfq, ask, bid } = operation.input;
      let calculatedBid: Quote | null = null;
      let calculatedAsk: Quote | null = null;
      const { size } = rfq;
      if (size.type === 'fixed-base') {
        switch (rfq.orderType) {
          case 'buy':
            if (ask?.price) {
              calculatedAsk = getQuote(size, ask.price, rfq);
            }
            break;
          case 'sell':
            if (bid?.price) {
              calculatedBid = getQuote(size, bid.price, rfq);
            }
            break;
          case 'two-way':
            if (ask?.price) {
              calculatedAsk = getQuote(size, ask.price, rfq);
            }
            if (bid?.price) {
              calculatedBid = getQuote(size, bid.price, rfq);
            }
            break;
        }
      } else if (size.type === 'fixed-quote') {
        switch (rfq.orderType) {
          case 'buy':
            if (ask?.price && ask.legsMultiplier) {
              calculatedAsk = getQuote(
                size,
                ask.price / ask.legsMultiplier,
                rfq
              );
            }
            break;
          case 'sell':
            if (bid?.price && bid.legsMultiplier) {
              calculatedBid = getQuote(
                size,
                bid.price / bid.legsMultiplier,
                rfq
              );
            }
            break;
          case 'two-way':
            if (ask?.price && ask.legsMultiplier) {
              calculatedAsk = getQuote(
                size,
                ask.price / ask.legsMultiplier,
                rfq
              );
            }
            if (bid?.price && bid.legsMultiplier) {
              calculatedBid = getQuote(
                size,
                bid.price / bid.legsMultiplier,
                rfq
              );
            }
            break;
        }
      } else if (size.type === 'open') {
        switch (rfq.orderType) {
          case 'buy':
            if (ask?.price && ask.legsMultiplier) {
              calculatedAsk = getQuote(
                size,
                ask.price / ask.legsMultiplier,
                rfq,
                ask.legsMultiplier
              );
            }
            break;
          case 'sell':
            if (bid?.price && bid.legsMultiplier) {
              calculatedBid = getQuote(
                size,
                bid.price / bid.legsMultiplier,
                rfq,
                bid.legsMultiplier
              );
            }
            break;
          case 'two-way':
            if (ask?.price && ask.legsMultiplier) {
              calculatedAsk = getQuote(
                size,
                ask.price / ask.legsMultiplier,
                rfq,
                ask.legsMultiplier
              );
            }
            if (bid?.price && bid.legsMultiplier) {
              calculatedBid = getQuote(
                size,
                bid.price / bid.legsMultiplier,
                rfq,
                bid.legsMultiplier
              );
            }
            break;
        }
      }

      return { calculatedAsk, calculatedBid };
    },
  };

const getQuote = (
  size: FixedSize,
  amount: number,
  rfq: Rfq,
  legsMultiplier?: number
) => {
  let response: Quote;
  if (size.type === 'open') {
    response = {
      price: roundDown(amount, rfq.quoteAsset.getDecimals()),
      legsMultiplier,
    };
    return response;
  }
  response = {
    price: roundDown(amount, rfq.quoteAsset.getDecimals()),
  };
  return response;
};
