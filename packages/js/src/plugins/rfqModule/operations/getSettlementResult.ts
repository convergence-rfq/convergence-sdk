import { QuoteSide } from '@convergence-rfq/rfq';
import { Rfq, Response } from '../models';
import { Operation, OperationHandler, useOperation } from '../../../types';
import { LEG_MULTIPLIER_DECIMALS } from '../constants';
import { Confirmation } from '../models/Confirmation';
import { roundDown, roundUp } from '@/utils';
const Key = 'GetSettlementResult' as const;

export type Receiver = 'taker' | 'maker';

export interface SettlementPartyInfo {
  amount: number;
  receiver: Receiver;
}

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
  confirmed: Confirmation | null;
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
      const { response, rfq, confirmed } = operation.input;
      //Checks
      if (!response.rfq.equals(rfq.address)) {
        throw new Error('Response does not match RFQ');
      }
      // if (!response.confirmed) {
      //   throw new Error('Response not confirmed');
      // }
      const quoteReceiver = getQuoteTokensReceiver(response, confirmed);
      const quoteAmount = getQuoteAssetsAmountToTransfer(
        rfq,
        response,
        confirmed
      );
      const quote = {
        receiver: quoteReceiver,
        amount: quoteAmount,
      };
      const legs = rfq.legs.map((leg, index) => {
        const legReceiver = getLegAssetsReceiver(rfq, index, confirmed);
        const legAmount = getLegAssetsAmountToTransfer(
          rfq,
          response,
          index,
          confirmed
        );
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
  legIndex: number,
  confirmed: Confirmation | null
) => {
  const leg = rfq.legs[legIndex];
  let receiver: Receiver = 'taker';
  if (leg.getSide() === 'short') {
    receiver = inverseReceiver(receiver);
  }
  if (confirmed!.side === QuoteSide.Bid) {
    receiver = inverseReceiver(receiver);
  }
  return receiver;
};

const getQuoteTokensReceiver = (
  response: Response,
  confirmed: Confirmation | null
) => {
  const quote = getConfirmedQuote(response, confirmed);
  let receiver: Receiver = 'maker';
  const price = quote?.price;
  if (QuoteSide.Bid === confirmed?.side) {
    receiver = inverseReceiver(receiver);
  }
  if (price < 0) {
    receiver = inverseReceiver(receiver);
  }
  return receiver;
};

const getLegAssetsAmountToTransfer = (
  rfq: Rfq,
  response: Response,
  legIndex: number,
  confirmed: Confirmation | null
) => {
  const leg = rfq.legs[legIndex];
  const legsMultiplier = getConfirmedLegsMultiplier(response, rfq, confirmed);
  let legAmount = leg.getAmount() * legsMultiplier;
  const receiver = getLegAssetsReceiver(rfq, legIndex, confirmed);

  if (receiver === 'maker') {
    legAmount = roundUp(legAmount, LEG_MULTIPLIER_DECIMALS);
  } else if (receiver === 'taker') {
    legAmount = roundDown(legAmount, LEG_MULTIPLIER_DECIMALS);
  }

  return legAmount;
};

const getQuoteAssetsAmountToTransfer = (
  rfq: Rfq,
  response: Response,
  confirmed: Confirmation | null
) => {
  const quote = getConfirmedQuote(response, confirmed);
  const legsMultiplier = getConfirmedLegsMultiplier(response, rfq, confirmed);
  if (rfq.size.type === 'fixed-quote') {
    return rfq.size.amount;
  }
  const positivePrice = Math.abs(Number(quote?.price));
  let quoteAmount = legsMultiplier * positivePrice;
  const receiver = getQuoteTokensReceiver(response, confirmed);

  if (receiver === 'maker') {
    quoteAmount = roundUp(quoteAmount, LEG_MULTIPLIER_DECIMALS);
  } else if (receiver === 'taker') {
    quoteAmount = roundDown(quoteAmount, LEG_MULTIPLIER_DECIMALS);
  }

  return quoteAmount;
};

export const getConfirmedLegsMultiplier = (
  response: Response,
  rfq: Rfq,
  confirmed: Confirmation | null
) => {
  const quote = getConfirmedQuote(response, confirmed);
  if (response.confirmed?.overrideLegMultiplier) {
    return response.confirmed?.overrideLegMultiplier;
  } else if (quote?.legsMultiplier) {
    return quote?.legsMultiplier;
  }
  switch (rfq.size.type) {
    case 'fixed-quote':
      const quoteAmount = rfq.size.amount;
      const price = quote?.price;
      const amount = quoteAmount / price;

      return Number(amount.toFixed(LEG_MULTIPLIER_DECIMALS));

    case 'fixed-base':
      return rfq.size.amount;
  }
  throw new Error('No confirmed leg multiplier');
};

const getConfirmedQuote = (
  response: Response,
  confirmed: Confirmation | null
) => {
  // const { confirmed } = response;

  if (confirmed?.side === QuoteSide.Ask && response?.ask) {
    return response.ask;
  } else if (confirmed?.side === QuoteSide.Bid && response?.bid) {
    return response.bid;
  }
  throw new Error('confimed quote not found');
};

const inverseReceiver = (receiver: Receiver): Receiver => {
  return receiver === 'maker' ? 'taker' : 'maker';
};
