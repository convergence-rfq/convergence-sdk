import { QuoteSide } from '@convergence-rfq/rfq';
import { Rfq, Response } from '../models';
import { Operation, OperationHandler, useOperation } from '../../../types';
import { LEG_MULTIPLIER_DECIMALS } from '../constants';
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
      const quote = {
        receiver: quoteReceiver,
        amount: quoteAmount,
      };
      const legs = rfq.legs.map((leg, index) => {
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
  if (leg.getSide() === 'short') {
    receiver = inverseReceiver(receiver);
  }
  if (confirmed!.side === QuoteSide.Bid) {
    receiver = inverseReceiver(receiver);
  }
  return receiver;
};

const getQuoteTokensReceiver = (response: Response) => {
  const quote = getConfirmedQuote(response);
  const { confirmed } = response;
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
  legIndex: number
) => {
  const leg = rfq.legs[legIndex];
  const legsMultiplier = getConfirmedLegsMultiplier(response, rfq);
  let legAmount = leg.getAmount() * legsMultiplier;
  const receiver = getLegAssetsReceiver(rfq, response, legIndex);

  if (receiver === 'maker') {
    legAmount = roundUp(legAmount, LEG_MULTIPLIER_DECIMALS);
  } else if (receiver === 'taker') {
    legAmount = roundDown(legAmount, LEG_MULTIPLIER_DECIMALS);
  }

  return legAmount;
};

const getQuoteAssetsAmountToTransfer = (rfq: Rfq, response: Response) => {
  const quote = getConfirmedQuote(response);
  const legsMultiplier = getConfirmedLegsMultiplier(response, rfq);
  if (rfq.size.type === 'fixed-quote') {
    return rfq.size.amount;
  }
  const positivePrice = Math.abs(Number(quote?.price));
  let quoteAmount = legsMultiplier * positivePrice;
  const receiver = getQuoteTokensReceiver(response);

  if (receiver === 'maker') {
    quoteAmount = roundUp(quoteAmount, LEG_MULTIPLIER_DECIMALS);
  } else if (receiver === 'taker') {
    quoteAmount = roundDown(quoteAmount, LEG_MULTIPLIER_DECIMALS);
  }

  return quoteAmount;
};

export const getConfirmedLegsMultiplier = (response: Response, rfq: Rfq) => {
  const quote = getConfirmedQuote(response);
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

const getConfirmedQuote = (response: Response) => {
  const { confirmed } = response;

  if (confirmed?.side === QuoteSide.Ask && response?.ask) {
    return response.ask;
  } else if (confirmed?.side === QuoteSide.Bid && response?.bid) {
    return response.bid;
  }
  throw new Error('No confirmed quote');
};

const inverseReceiver = (receiver: Receiver): Receiver => {
  return receiver === 'maker' ? 'taker' : 'maker';
};
