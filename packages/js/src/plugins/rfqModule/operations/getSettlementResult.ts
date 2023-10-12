import { Rfq, Response } from '../models';
import { Operation, SyncOperationHandler, useOperation } from '../../../types';
import { Confirmation } from '../models/Confirmation';
import { roundDown } from '@/utils';
import { extractLegAmount } from '@/plugins/rfqModule/helpers';
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
  leg: SettlementPartyInfo;
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

      return {
        quote: {
          receiver: getQuoteTokensReceiver(confirmation),
          amount: getQuoteAssetsAmountToTransfer(rfq, response, confirmation),
        },
        leg: {
          receiver: getLegAssetsReceiver(confirmation),
          amount: getLegAssetsAmountToTransfer(rfq, response, confirmation),
        },
      };
    },
  };

const getLegAssetsReceiver = (confirmation: Confirmation) => {
  let receiver: Receiver = 'taker';
  if (confirmation.side === 'bid') {
    receiver = inverseReceiver(receiver);
  }
  return receiver;
};

const getQuoteTokensReceiver = (confirmation: Confirmation) => {
  let receiver: Receiver = 'maker';
  if (confirmation.side === 'bid') {
    receiver = inverseReceiver(receiver);
  }
  return receiver;
};

const getLegAssetsAmountToTransfer = (
  rfq: Rfq,
  response: Response,
  confirmation: Confirmation
) => {
  const quote = getConfirmedQuote(response, confirmation);
  const legAmount = extractLegAmount(rfq, quote, confirmation);

  return roundDown(legAmount, rfq.legAssetDecimals);
};

const getQuoteAssetsAmountToTransfer = (
  rfq: Rfq,
  response: Response,
  confirmation: Confirmation
) => {
  const quote = getConfirmedQuote(response, confirmation);
  const legAmount = extractLegAmount(rfq, quote, confirmation);
  if (rfq.size.type === 'fixed-quote') {
    return rfq.size.amount;
  }
  const quoteAmount = legAmount * quote.price;

  return roundDown(quoteAmount, rfq.quoteAssetDecimals);
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
