import { Rfq, Response } from '../models';
import { Operation, SyncOperationHandler, useOperation } from '../../../types';
import { LEG_MULTIPLIER_DECIMALS } from '../constants';
import { Confirmation } from '../models/Confirmation';
import { roundDown, roundUp } from '@/utils';
import { extractLegsMultiplier } from '@/plugins/rfqModule/helpers';
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
  confirmation?: Confirmation;
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
export const getSettlementResultHandler: SyncOperationHandler<GetSettlementResult> =
  {
    handle: (operation: GetSettlementResult): GetSettlementResultOutput => {
      const {
        response,
        rfq,
        confirmation: passedConfirmation,
      } = operation.input;
      let confirmation: Confirmation;
      //Checks
      if (!response.rfq.equals(rfq.address)) {
        throw new Error('Response does not match RFQ');
      }
      if (passedConfirmation) {
        confirmation = passedConfirmation;
      } else if (response?.confirmed) {
        confirmation = response.confirmed;
      } else {
        throw new Error(
          'Unconfirmed response requires passing explicit confirmation'
        );
      }

      const quoteReceiver = getQuoteTokensReceiver(response, confirmation);
      const quoteAmount = getQuoteAssetsAmountToTransfer(
        rfq,
        response,
        confirmation
      );
      const quote = {
        receiver: quoteReceiver,
        amount: quoteAmount,
      };
      const legs = rfq.legs.map((_, index) => {
        const legReceiver = getLegAssetsReceiver(rfq, index, confirmation);
        const legAmount = getLegAssetsAmountToTransfer(
          rfq,
          response,
          index,
          confirmation
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
  confirmation: Confirmation
) => {
  const leg = rfq.legs[legIndex];
  let receiver: Receiver = 'taker';
  if (leg.getSide() === 'short') {
    receiver = inverseReceiver(receiver);
  }
  if (confirmation.side === 'bid') {
    receiver = inverseReceiver(receiver);
  }
  return receiver;
};

const getQuoteTokensReceiver = (
  response: Response,
  confirmation: Confirmation
) => {
  const quote = getConfirmedQuote(response, confirmation);
  let receiver: Receiver = 'maker';
  const price = quote?.price;
  if (confirmation.side === 'bid') {
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
  confirmation: Confirmation
) => {
  const leg = rfq.legs[legIndex];
  const quote = getConfirmedQuote(response, confirmation);
  const legsMultiplier = extractLegsMultiplier(rfq, quote, confirmation);
  let legAmount = leg.getAmount() * legsMultiplier;
  const receiver = getLegAssetsReceiver(rfq, legIndex, confirmation);

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
  confirmation: Confirmation
) => {
  const quote = getConfirmedQuote(response, confirmation);
  const legsMultiplier = extractLegsMultiplier(rfq, quote, confirmation);
  if (rfq.size.type === 'fixed-quote') {
    return rfq.size.amount;
  }
  const positivePrice = Math.abs(Number(quote?.price));
  let quoteAmount = legsMultiplier * positivePrice;
  const receiver = getQuoteTokensReceiver(response, confirmation);

  if (receiver === 'maker') {
    quoteAmount = roundUp(quoteAmount, LEG_MULTIPLIER_DECIMALS);
  } else if (receiver === 'taker') {
    quoteAmount = roundDown(quoteAmount, LEG_MULTIPLIER_DECIMALS);
  }

  return quoteAmount;
};

const getConfirmedQuote = (response: Response, confirmation: Confirmation) => {
  if (confirmation.side === 'ask' && response?.ask) {
    return response.ask;
  } else if (confirmation.side === 'bid' && response?.bid) {
    return response.bid;
  }
  throw new Error('Confirmed quote not found');
};

const inverseReceiver = (receiver: Receiver): Receiver => {
  return receiver === 'maker' ? 'taker' : 'maker';
};
