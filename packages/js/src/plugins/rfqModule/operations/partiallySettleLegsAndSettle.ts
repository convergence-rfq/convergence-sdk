import { PublicKey } from '@solana/web3.js';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { settleBuilder } from './settle';
import { partiallySettleLegsBuilder } from './partiallySettleLegs';
import { Convergence } from '@/Convergence';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
  makeConfirmOptionsFinalizedOnMainnet,
} from '@/types';

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

      console.log('ready to settle finally')

      const output = await settleRfqBuilder.sendAndConfirm(
        convergence,
        confirmOptions
      );
      scope.throwIfCanceled();

      return { ...output };
    },
  };
