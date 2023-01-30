import { PublicKey } from '@solana/web3.js';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { Convergence } from '@/Convergence';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
  makeConfirmOptionsFinalizedOnMainnet,
} from '@/types';
import { settleBuilder } from './settle';
import { partiallySettleLegsBuilder } from './partiallySettleLegs';

const Key = 'PartiallySettleLegsAndSettleOperation' as const;

/**
 * Prepares for settlement.
 *
 * ```ts
 * await convergence
 *   .rfqs()
 *   .partiallySettleLegsAndSettle({ caller, rfq, response, side, legAmountToPrepare, quoteAsset };
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
  maker: PublicKey;

  taker: PublicKey;
  /** The protocol address */
  protocol?: PublicKey;
  /** The Rfq address */
  rfq: PublicKey;
  /** The response address */
  response: PublicKey;

  /*
   * Args
   */

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

      const MAX_TX_SIZE = 1232;

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

      let settleTxSize = await convergence
        .rpc()
        .getTransactionSize(settleRfqBuilder, []);

      const rfqModel = await convergence
        .rfqs()
        .findRfqByAddress({ address: rfq });

      let slicedIndex = rfqModel.legs.length;

      while (settleTxSize == -1 || settleTxSize + 193 > MAX_TX_SIZE) {
        const index = Math.trunc(slicedIndex / 2);
        const startIndex = rfqModel.legs.length - index;

        settleRfqBuilder = await settleBuilder(
          convergence,
          {
            ...operation.input,
            startIndex,
          },
          scope
        );

        settleTxSize = await convergence
          .rpc()
          .getTransactionSize(settleRfqBuilder, []);

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

        let partiallySettleTxSize = await convergence
          .rpc()
          .getTransactionSize(partiallySettleBuilder, []);

        while (
          partiallySettleTxSize == -1 ||
          partiallySettleTxSize + 193 > MAX_TX_SIZE
        ) {
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

          partiallySettleTxSize = await convergence
            .rpc()
            .getTransactionSize(partiallySettleBuilder, []);

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
