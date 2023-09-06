import { Quote, Rfq } from '../models';
import { Operation, SyncOperationHandler, useOperation } from '../../../types';
import { FixedSize } from '../models/FixedSize';
import { LEG_MULTIPLIER_DECIMALS } from '../constants';
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
    price: number;
    legsMultiplier: number | null;
  };
  bid?: {
    price: number;
    legsMultiplier: number | null;
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
      // Get the base and quote decimals
      const baseDecimals = LEG_MULTIPLIER_DECIMALS;
      const quoteDecimals = rfq.quoteAsset.getDecimals();
      let tmpAskLegMultiplier: number | null = null;
      let tmpAskPrice: number | null = null;
      let tmpAskPricePerToken: number | null = null;
      let tmpBidLegMultiplier: number | null = null;
      let tmpBidPrice: number | null = null;
      let tmpBidPricePerToken: number | null = null;

      const { size } = rfq;

      if (ask) {
        tmpAskLegMultiplier =
          !ask?.legsMultiplier || ask?.legsMultiplier <= 0
            ? null
            : roundToDecimals(ask.legsMultiplier, baseDecimals);
        tmpAskPrice =
          !ask?.price || ask?.price <= 0
            ? null
            : Math.round(ask?.price * Math.pow(10, quoteDecimals)) /
              Math.pow(10, quoteDecimals);
        tmpAskPricePerToken =
          tmpAskPrice && tmpAskLegMultiplier
            ? roundToDecimals(tmpAskPrice / tmpAskLegMultiplier, quoteDecimals)
            : null;
      }
      if (bid) {
        tmpBidLegMultiplier =
          !bid?.legsMultiplier || bid?.legsMultiplier <= 0
            ? null
            : roundToDecimals(bid.legsMultiplier, baseDecimals);

        tmpBidPrice =
          !bid?.price || bid?.price <= 0
            ? null
            : roundToDecimals(bid.price, quoteDecimals);

        tmpBidPricePerToken =
          tmpBidPrice && tmpBidLegMultiplier
            ? roundToDecimals(tmpBidPrice / tmpBidLegMultiplier, quoteDecimals)
            : null;
      } else {
        throw new Error('ask and bid both cannot be null');
      }

      if (size.type === 'fixed-base') {
        switch (rfq.orderType) {
          case 'buy':
            calculatedAsk = tmpAskPrice
              ? getQuote(size, tmpAskPrice, null)
              : null;
            calculatedBid = null;
            break;
          case 'sell':
            calculatedAsk = null;
            calculatedBid = tmpBidPrice
              ? getQuote(size, tmpBidPrice, null)
              : null;
            break;
          case 'two-way':
            calculatedAsk = tmpAskPrice
              ? getQuote(size, tmpAskPrice, null)
              : null;
            calculatedBid = tmpBidPrice
              ? getQuote(size, tmpBidPrice, null)
              : null;
            break;
          default:
            break;
        }
      } else if (size.type === 'fixed-quote') {
        switch (rfq.orderType) {
          case 'buy':
            calculatedAsk = tmpAskPricePerToken
              ? getQuote(size, tmpAskPricePerToken, null)
              : null;
            calculatedBid = null;
            break;
          case 'sell':
            calculatedAsk = null;
            calculatedBid = tmpBidPricePerToken
              ? getQuote(size, tmpBidPricePerToken, null)
              : null;
            break;
          case 'two-way':
            calculatedAsk = tmpAskPricePerToken
              ? getQuote(size, tmpAskPricePerToken, null)
              : null;
            calculatedBid = tmpBidPricePerToken
              ? getQuote(size, tmpBidPricePerToken, null)
              : null;
            break;
          default:
            break;
        }
      } else if (size.type === 'open') {
        switch (rfq.orderType) {
          case 'buy':
            calculatedAsk =
              tmpAskLegMultiplier && tmpAskPricePerToken
                ? getQuote(size, tmpAskPricePerToken, tmpAskLegMultiplier)
                : null;
            calculatedBid = null;
            break;
          case 'sell':
            calculatedAsk = null;
            calculatedBid =
              tmpBidLegMultiplier && tmpBidPricePerToken
                ? getQuote(size, tmpBidPricePerToken, tmpBidLegMultiplier)
                : null;
            break;
          case 'two-way':
            calculatedAsk =
              tmpAskLegMultiplier && tmpAskPricePerToken
                ? getQuote(size, tmpAskPricePerToken, tmpAskLegMultiplier)
                : null;
            calculatedBid =
              tmpBidLegMultiplier && tmpBidPricePerToken
                ? getQuote(size, tmpBidPricePerToken, tmpBidLegMultiplier)
                : null;
            break;
          default:
            break;
        }
      }

      return { calculatedAsk, calculatedBid };
    },
  };

const getQuote = (
  size: FixedSize,
  amount: number,
  legsMultiplier: number | null
) => {
  if (amount === null) return null;
  if (size.type === 'open') {
    const response: Quote = {
      price: amount,
      legsMultiplier: legsMultiplier ? legsMultiplier : undefined,
    };
    return response;
  }
  const response: Quote = {
    price: amount,
  };
  return response;
};

const roundToDecimals = (value: number, decimals: number) => {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
};
