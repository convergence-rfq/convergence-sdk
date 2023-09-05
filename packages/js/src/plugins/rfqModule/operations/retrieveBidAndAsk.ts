import { Quote, Rfq } from '../models';
import { Operation, SyncOperationHandler, useOperation } from '../../../types';
import { FixedSize } from '../models/FixedSize';
const Key = 'RetrieveAskAndBid' as const;

export type Receiver = 'taker' | 'maker';

export interface SettlementPartyInfo {
  amount: number;
  receiver: Receiver;
}

/**
 * retrieveAskAndBid.
 *
 * ```ts
 * const result = await convergence.rfqs().retrieveAskAndBid({
 * rfq,
 * })
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const retrieveAskAndBidOperation = useOperation<RetrieveAskAndBid>(Key);

/**
 * @group Operations
 * @category Types
 */
export type RetrieveAskAndBid = Operation<
  typeof Key,
  RetrieveAskAndBidInput,
  RetrieveAskAndBidOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type RetrieveAskAndBidInput = {
  rfq: Rfq;
  bidBaseSize: string;
  bidQuoteAmount: string;
  askBaseSize: string;
  askQuoteAmount: string;
};

/**
 * @group Operations
 * @category Outputs
 */
export type RetrieveAskAndBidOutput = {
  ask: Quote | null;
  bid: Quote;
};

/**
 * @group Operations
 * @category Handlers
 */
export const retrieveAskAndBidHandler: SyncOperationHandler<RetrieveAskAndBid> =
  {
    handle: (operation: RetrieveAskAndBid): RetrieveAskAndBidOutput => {
      const { rfq, bidBaseSize, bidQuoteAmount, askBaseSize, askQuoteAmount } =
        operation.input;
      let bid: Quote | null;
      let ask: Quote | null;
      // Get the base and quote decimals
      const baseDecimals = rfq.legs[0].getDecimals();
      const quoteDecimals = rfq.quoteAsset.getDecimals();

      const { size } = rfq;
      const tmpBidBaseSize =
        bidBaseSize === '' || Number(bidBaseSize) <= 0
          ? null
          : Math.round(Number(bidBaseSize) * Math.pow(10, baseDecimals)) /
            Math.pow(10, baseDecimals);
      const tmpAskBaseSize =
        askBaseSize === '' || Number(askBaseSize) <= 0
          ? null
          : Math.round(Number(askBaseSize) * Math.pow(10, baseDecimals)) /
            Math.pow(10, baseDecimals);
      const tmpBidQuoteAmount =
        bidQuoteAmount === '' || Number(bidQuoteAmount) <= 0
          ? null
          : Math.round(Number(bidQuoteAmount) * Math.pow(10, quoteDecimals)) /
            Math.pow(10, quoteDecimals);
      const tmpAskQuoteAmount =
        askQuoteAmount === '' || Number(askQuoteAmount) <= 0
          ? null
          : Math.round(Number(askQuoteAmount) * Math.pow(10, quoteDecimals)) /
            Math.pow(10, quoteDecimals);
      const tmpAskPricePerToken =
        tmpAskQuoteAmount && tmpAskBaseSize
          ? Math.round(
              (tmpAskQuoteAmount / tmpAskBaseSize) * Math.pow(10, quoteDecimals)
            ) / Math.pow(10, quoteDecimals)
          : null;
      const tmpBidPricePerToken =
        tmpBidQuoteAmount && tmpBidBaseSize
          ? Math.round(
              (tmpBidQuoteAmount / tmpBidBaseSize) * Math.pow(10, quoteDecimals)
            ) / Math.pow(10, quoteDecimals)
          : null;

      if (type === 'fixed-base') {
        switch (rfq.orderType) {
          case 'buy':
            ask = tmpAskQuoteAmount
              ? getResponseObject(size, tmpAskQuoteAmount, null)
              : null;
            bid = null;
            break;
          case 'sell':
            ask = null;
            bid = tmpBidQuoteAmount
              ? getResponseObject(size, tmpBidQuoteAmount, null)
              : null;
            break;
          case 'two-way':
            ask = tmpAskQuoteAmount
              ? getResponseObject(size, tmpAskQuoteAmount, null)
              : null;
            bid = tmpBidQuoteAmount
              ? getResponseObject(size, tmpBidQuoteAmount, null)
              : null;
            break;
          default:
            break;
        }
      } else if (size.type === 'fixed-quote') {
        switch (rfq.orderType) {
          case 'buy':
            ask = tmpAskPricePerToken
              ? getResponseObject(size, tmpAskPricePerToken, null)
              : null;
            bid = null;
            break;
          case 'sell':
            ask = null;
            bid = tmpBidPricePerToken
              ? getResponseObject(size, tmpBidPricePerToken, null)
              : null;
            break;
          case 'two-way':
            ask = tmpAskPricePerToken
              ? getResponseObject(size, tmpAskPricePerToken, null)
              : null;
            bid = tmpBidPricePerToken
              ? getResponseObject(size, tmpBidPricePerToken, null)
              : null;
            break;
          default:
            break;
        }
      } else if (size.type === 'open') {
        switch (rfq.orderType) {
          case 'buy':
            ask =
              tmpAskBaseSize && tmpAskPricePerToken
                ? getResponseObject(size, tmpAskPricePerToken, tmpAskBaseSize)
                : null;
            bid = null;
            break;
          case 'sell':
            ask = null;
            bid =
              tmpBidBaseSize && tmpBidPricePerToken
                ? getResponseObject(size, tmpBidPricePerToken, tmpBidBaseSize)
                : null;
            break;
          case 'two-way':
            ask =
              tmpAskBaseSize && tmpAskPricePerToken
                ? getResponseObject(size, tmpAskPricePerToken, tmpAskBaseSize)
                : null;
            bid =
              tmpBidBaseSize && tmpBidPricePerToken
                ? getResponseObject(size, tmpBidPricePerToken, tmpBidBaseSize)
                : null;
            break;
          default:
            break;
        }
      }

      return { ask, bid };
    },
  };

const getResponseObject = (
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
