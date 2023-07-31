import { Rfq, Response } from '../models';
import { Operation, OperationHandler, useOperation } from '../../../types';
import {
  AssetIdentifier,
  getSettlementAssetsAmountTotransfer,
  getSettlementAssetsReceiver,
  SettlementPartyInfo,
} from '../helpers';

const Key = 'GetSettlementResult' as const;

/**
 * Finds all RFQs.
 *
 * ```ts
 * const rfq = await convergence
 *   .rfqs()
 *   .find();
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
        receiver: null,
        amount: null,
      };
      const legs: SettlementPartyInfo[] = [];
      const { response, rfq } = operation.input;
      //Checks
      if (!response.rfq.equals(rfq.address)) {
        throw new Error('Response does not match RFQ');
      }
      if (!response.confirmed) {
        throw new Error('Response not confirmed');
      }
      const quoteReceiver = getSettlementAssetsReceiver(
        rfq,
        response,
        AssetIdentifier.QUOTE
      );
      const quoteAmount = getSettlementAssetsAmountTotransfer(
        rfq,
        response,
        AssetIdentifier.QUOTE
      );
      if (quoteAmount) {
        quote = {
          receiver: quoteReceiver,
          amount: quoteAmount,
        };
      }
      rfq.legs.map((leg, index) => {
        const legReceiver = getSettlementAssetsReceiver(
          rfq,
          response,
          AssetIdentifier.LEG,
          index
        );
        const legAmount = getSettlementAssetsAmountTotransfer(
          rfq,
          response,
          AssetIdentifier.LEG,
          index
        );
        if (legAmount) {
          legs.push({
            receiver: legReceiver,
            amount: legAmount,
          });
        }
      });
      return { quote, legs };
    },
  };
