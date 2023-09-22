import { PublicKey } from '@solana/web3.js';

import { Convergence } from '../../../Convergence';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
  makeConfirmOptionsFinalizedOnMainnet,
} from '../../../types';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { settleBuilder } from './settle';
import { partiallySettleLegsBuilder } from './partiallySettleLegs';

const Key = 'PartiallySettleLegsAndSettleOperation' as const;

/**
 * Partially settles legs and settles the remaining legs
 *
 * ```ts
 * const quoteAsset = instrumentClient.createQuote(new SpotInstrument(...));
 *
 * await convergence
 *   .rfqs()
 *   .partiallySettleLegsAndSettle({
 *     rfq: rfq.address,
 *     response: rfqResponse.address,
 *     side: Side.Bid,
 *     legAmountToPrepare: 3,
 *     quoteAsset
 *   });
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const partiallySettleLegsAndSettleOperation =
  useOperation<PartiallySettleLegsAndSettleOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type PartiallySettleLegsAndSettleOperation = Operation<
  typeof Key,
  PartiallySettleLegsAndSettleInput,
  PartiallySettleLegsAndSettleOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type PartiallySettleLegsAndSettleInput = {
  /**
   * The protocol address.
   * @defaultValue `convergence.protocol().pdas().protocol()`
   */
  protocol?: PublicKey;

  /** The Rfq address. */
  rfq: PublicKey;

  /** The Response address. */
  response: PublicKey;

  /** The Maker's public key address. */
  maker: PublicKey;

  /** The Taker's public key address. */
  taker: PublicKey;

  /*
   * Args
   */

  /** The number of legs to settle. */
  legAmountToSettle: number;
};

/**
 * @group Operations
 * @category Outputs
 */
export type PartiallySettleLegsAndSettleOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */

export const partiallySettleLegsAndSettleOperationHandler: OperationHandler<PartiallySettleLegsAndSettleOperation> =
  {
    handle: async (
      operation: PartiallySettleLegsAndSettleOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<PartiallySettleLegsAndSettleOutput> => {
      const { rfq } = operation.input;

      const confirmOptions = makeConfirmOptionsFinalizedOnMainnet(
        convergence,
        scope.confirmOptions
      );

      let settleRfqBuilder = await settleBuilder(
        convergence,
        {
          ...operation.input,
        },
        scope
      );
      scope.throwIfCanceled();

      const rfqModel = await convergence
        .rfqs()
        .findRfqByAddress({ address: rfq });

      let slicedIndex = rfqModel.legs.length;

      while (settleRfqBuilder.checkTransactionFits()) {
        const index = Math.trunc(slicedIndex / 2);
        // const startIndex = rfqModel.legs.length - index;
        const startIndex = rfqModel.legs.length - index + 3;

        settleRfqBuilder = await settleBuilder(
          convergence,
          {
            ...operation.input,
            startIndex,
          },
          scope
        );

        slicedIndex = index;
      }

      if (slicedIndex < rfqModel.legs.length) {
        let partiallySettleSlicedLegAmount = rfqModel.legs.length - slicedIndex;

        let partiallySettleBuilder = await partiallySettleLegsBuilder(
          convergence,
          {
            ...operation.input,
            legAmountToSettle: partiallySettleSlicedLegAmount,
          },
          scope
        );

        while (partiallySettleBuilder.checkTransactionFits()) {
          const halvedLegAmount = Math.trunc(
            partiallySettleSlicedLegAmount / 2
          );

          partiallySettleBuilder = await partiallySettleLegsBuilder(
            convergence,
            {
              ...operation.input,
              legAmountToSettle: halvedLegAmount,
            },
            scope
          );

          partiallySettleSlicedLegAmount = halvedLegAmount;
        }

        await partiallySettleBuilder.sendAndConfirm(
          convergence,
          confirmOptions
        );
        scope.throwIfCanceled();

        let x = partiallySettleSlicedLegAmount;

        if (partiallySettleSlicedLegAmount < rfqModel.legs.length) {
          while (x + slicedIndex < rfqModel.legs.length) {
            const nextPartiallySettleLegs =
              rfqModel.legs.length - slicedIndex - x;

            const nextPartiallySettleBuilder = await partiallySettleLegsBuilder(
              convergence,
              {
                ...operation.input,
                legAmountToSettle: nextPartiallySettleLegs,
              },
              scope
            );

            await nextPartiallySettleBuilder.sendAndConfirm(
              convergence,
              confirmOptions
            );
            scope.throwIfCanceled();

            x += nextPartiallySettleLegs;
          }
        }
      }

      const output = await settleRfqBuilder.sendAndConfirm(
        convergence,
        confirmOptions
      );
      scope.throwIfCanceled();

      return { ...output };
    },
  };
