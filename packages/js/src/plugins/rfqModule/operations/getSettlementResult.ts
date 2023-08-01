import { QuoteSide } from '@convergence-rfq/rfq';
import { Rfq, Response } from '../models';
import { Operation, OperationHandler, useOperation } from '../../../types';
import { Receiver, SettlementPartyInfo, inverseReceiver } from '../helpers';
import { removeDecimals } from '@/utils';

const Key = 'GetSettlementResult' as const;

/**
 * getSettlementResult.
 *
 * ```ts
 * const result = await convergence.rfqs().getSettlementResult({
 *  response,
 * rfq,
 * })
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const getSettlementResultOperation =
  useOperation<GetSettlementResult>(Key);

/**
 * @group Operations
 * @category Types
 */
export type GetSettlementResult = Operation<
  typeof Key,
  GetSettlementResultInput,
  GetSettlementResultOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type GetSettlementResultInput = {
  response: Response;
  rfq: Rfq;
};

/**
 * @group Operations
 * @category Outputs
 */
export type GetSettlementResultOutput = {
  quote: SettlementPartyInfo;
  legs: SettlementPartyInfo[];
};

/**
 * @group Operations
 * @category Handlers
 */
export const getSettlementResultHandler: OperationHandler<GetSettlementResult> =
  {
    handle: async (
      operation: GetSettlementResult
    ): Promise<GetSettlementResultOutput> => {
      let quote: SettlementPartyInfo = {
        receiver: undefined,
        amount: undefined,
      };
      let legs: SettlementPartyInfo[] = [];
      const { response, rfq } = operation.input;
      //Checks
      if (!response.rfq.equals(rfq.address)) {
        throw new Error('Response does not match RFQ');
      }
      if (!response.confirmed) {
        throw new Error('Response not confirmed');
      }
      const quoteReceiver = getQuoteTokensReceiver(response);
      const quoteAmount = getQuoteAssetsAmountToTransfer(rfq, response);
      if (quoteAmount) {
        quote = {
          receiver: quoteReceiver,
          amount: quoteAmount,
        };
      }
      legs = rfq.legs.map((leg, index) => {
        const legReceiver = getLegAssetsReceiver(rfq, response, index);
        const legAmount = getLegAssetsAmountToTransfer(rfq, response, index);
        return {
          receiver: legReceiver,
          amount: legAmount,
        };
      });
      return { quote, legs };
    },
  };

const getLegAssetsReceiver = (
  rfq: Rfq,
  response: Response,
  legIndex: number
) => {
  const leg = rfq.legs[legIndex];
  const { confirmed } = response;
  let receiver: Receiver = 'taker';
  if (leg.getSide() === 'short' || confirmed?.side === QuoteSide.Bid) {
    receiver = inverseReceiver(receiver);
  }
  return receiver;
};

const getQuoteTokensReceiver = (response: Response) => {
  const confirmation = response.confirmed;
  let receiver: Receiver = 'maker';
  if (confirmation) {
    const quote =
      confirmation?.side === QuoteSide.Ask ? response.ask : response.bid;
    const price = quote?.price;

    if (QuoteSide.Bid === confirmation.side) {
      receiver = inverseReceiver(receiver);
    }
    if (price) {
      if (price < 0) {
        receiver = inverseReceiver(receiver);
      }
    }
  }
  return receiver;
};

const getLegAssetsAmountToTransfer = (
  rfq: Rfq,
  response: Response,
  legIndex: number
) => {
  const quote = response?.bid ? response.bid : response.ask;
  const leg = rfq.legs[legIndex];
  let legsMultiplierBps: number = getConfirmedlegMultiplierBps(response);
  if (quote) {
    switch (rfq.size.type) {
      case 'fixed-quote':
        const quoteAmount = rfq.size.amount;
        const { price } = quote;
        const legDecimals = leg.getDecimals();
        const amount = quoteAmount / price;
        if (Number.isInteger(amount)) {
          legsMultiplierBps = amount;
        } else {
          legsMultiplierBps = Number(amount.toFixed(legDecimals));
        }
        break;
      default:
        break;
    }
    const legAmount = leg.getAmount() * legsMultiplierBps;

    return legAmount;
  }
};

const getQuoteAssetsAmountToTransfer = (rfq: Rfq, response: Response) => {
  const quote = response?.bid ? response.bid : response.ask;
  let positivePrice: number;
  if (quote) {
    let legsMultiplierBps: number;
    switch (rfq.size.type) {
      case 'fixed-quote':
        return rfq.size.amount;
      case 'fixed-base':
        legsMultiplierBps = getConfirmedlegMultiplierBps(response);
        positivePrice = Math.abs(quote.price);
        return legsMultiplierBps * positivePrice;

      case 'open':
        legsMultiplierBps = getConfirmedlegMultiplierBps(response);
        positivePrice = Math.abs(quote.price);
        return legsMultiplierBps * positivePrice;
    }
  }
};

const getConfirmedlegMultiplierBps = (response: Response) => {
  const quote = response?.bid ? response.bid : response.ask;
  const defaultLegMultiplierBps = quote?.legsMultiplierBps
    ? Number(quote.legsMultiplierBps)
    : 1;
  const confirmation = response.confirmed;
  if (confirmation) {
    if (confirmation.overrideLegMultiplierBps) {
      return removeDecimals(confirmation.overrideLegMultiplierBps, 9);
    }
    return defaultLegMultiplierBps;
  }
  return defaultLegMultiplierBps;
};
