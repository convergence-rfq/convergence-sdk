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
      const {
        // taker = convergence.identity(),
        rfq,
      } = operation.input;

      const MAX_TX_SIZE = 1232;

      let settleRfqBuilder = await settleBuilder(
        convergence,
        {
          ...operation.input,
        },
        scope
      );
      scope.throwIfCanceled();

      const confirmOptions = makeConfirmOptionsFinalizedOnMainnet(
        convergence,
        scope.confirmOptions
      );

      let txSize = await convergence.rpc().getTransactionSize(settleRfqBuilder);

      const rfqModel = await convergence
        .rfqs()
        .findRfqByAddress({ address: rfq });

      let slicedIdx = rfqModel.legs.length;

      while (txSize == -1 || txSize + 193 > MAX_TX_SIZE) {
        const idx = Math.trunc(slicedIdx / 2);

        settleRfqBuilder = await settleBuilder(
          convergence,
          {
            ...operation.input,
          },
          scope
        );

        txSize = await convergence
          .rpc()
          .getTransactionSize(settleRfqBuilder, []);

        slicedIdx = idx;
      }

      if (slicedIdx < rfqModel.legs.length) {
        let partiallySettleSlicedIdx = rfqModel.legs.length - slicedIdx;

        let partiallySettleBuilder = await partiallySettleLegsBuilder(
          convergence,
          {
            ...operation.input,
            legAmountToSettle: partiallySettleSlicedIdx,
          },
          scope
        );

        let partiallySettleTxSize = await convergence
          .rpc()
          .getTransactionSize(partiallySettleBuilder);

        while (
          partiallySettleTxSize == -1 ||
          partiallySettleTxSize + 193 > MAX_TX_SIZE
        ) {
          const halvedIdx = Math.trunc(partiallySettleSlicedIdx / 2);

          partiallySettleBuilder = await partiallySettleLegsBuilder(
            convergence,
            {
              ...operation.input,
              legAmountToSettle: halvedIdx,
            },
            scope
          );

          partiallySettleTxSize = await convergence
            .rpc()
            .getTransactionSize(partiallySettleBuilder);

          partiallySettleSlicedIdx = halvedIdx;
        }

        await partiallySettleBuilder.sendAndConfirm(
          convergence,
          confirmOptions
        );
        scope.throwIfCanceled();

        let x = partiallySettleSlicedIdx;

        if (partiallySettleSlicedIdx < rfqModel.legs.length) {
          while (x + slicedIdx < rfqModel.legs.length) {
            const ins = rfqModel.legs.length - slicedIdx - x;

            const nextPartiallySettleBuilder = await partiallySettleLegsBuilder(
              convergence,
              {
                ...operation.input,
                legAmountToSettle: ins,
              },
              scope
            );

            await nextPartiallySettleBuilder.sendAndConfirm(
              convergence,
              confirmOptions
            );
            scope.throwIfCanceled();

            x += ins;
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
