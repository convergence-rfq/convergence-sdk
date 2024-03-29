import { PublicKey } from '@solana/web3.js';

import { Convergence } from '../../../Convergence';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
  Signer,
  makeConfirmOptionsFinalizedOnMainnet,
} from '../../../types';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { prepareSettlementBuilder } from './prepareSettlement';
import { prepareMoreLegsSettlementBuilder } from './prepareMoreLegsSettlement';

const Key = 'PrepareSettlementAndPrepareMoreLegsOperation' as const;

/**
 * Prepares for settlement and prepares more legs for settlement.
 *
 * ```ts
 * await convergence
 *   .rfqs()
 *   .prepareSettlementAndPrepareMoreLegs({
 *     rfq: rfq.address,
 *     response: rfqResponse.address,
 *     legAmountToPrepare: 3
 *   });
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const prepareSettlementAndPrepareMoreLegsOperation =
  useOperation<PrepareSettlementAndPrepareMoreLegsOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type PrepareSettlementAndPrepareMoreLegsOperation = Operation<
  typeof Key,
  PrepareSettlementAndPrepareMoreLegsInput,
  PrepareSettlementAndPrepareMoreLegsOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type PrepareSettlementAndPrepareMoreLegsInput = {
  /**
   * The caller to prepare settlement of the Rfq.
   *
   * @defaultValue `convergence.identity()`
   */
  caller?: Signer;

  /**
   * The protocol address.
   * @defaultValue `convergence.protocol().pdas().protocol(),`
   */
  protocol?: PublicKey;

  /** The address of the Rfq account. */
  rfq: PublicKey;

  /** The address of the Response account. */
  response: PublicKey;

  /*
   * Args
   */

  /** The number of legs to prepare settlement for. */
  legAmountToPrepare: number;
};

/**
 * @group Operations
 * @category Outputs
 */
export type PrepareSettlementAndPrepareMoreLegsOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const prepareSettlementAndPrepareMoreLegsOperationHandler: OperationHandler<PrepareSettlementAndPrepareMoreLegsOperation> =
  {
    handle: async (
      operation: PrepareSettlementAndPrepareMoreLegsOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<PrepareSettlementAndPrepareMoreLegsOutput> => {
      const { legAmountToPrepare, rfq } = operation.input;
      const rfqModel = await convergence.rfqs().findRfqByAddress({
        address: rfq,
      });

      const result = await prepareSettlementBuilder(
        convergence,
        rfqModel,
        {
          ...operation.input,
        },
        scope
      );
      scope.throwIfCanceled();

      let slicedLegAmount = legAmountToPrepare;
      const { ataTxBuilderArray } = result;
      let prepareBuilder = result.prepareSettlementTxBuilder;

      while (!prepareBuilder.checkTransactionFits()) {
        const halvedLegAmount = Math.trunc(slicedLegAmount / 2);

        const result = await prepareSettlementBuilder(
          convergence,
          rfqModel,
          {
            ...operation.input,
            legAmountToPrepare: halvedLegAmount,
          },
          scope
        );
        prepareBuilder = result.prepareSettlementTxBuilder;

        slicedLegAmount = halvedLegAmount;
      }

      const confirmOptions = makeConfirmOptionsFinalizedOnMainnet(
        convergence,
        scope.confirmOptions
      );

      const latestValidBlockHeight = await convergence
        .rpc()
        .getLatestBlockhash();
      const ataTxs = ataTxBuilderArray.map((builder) =>
        builder.toTransaction(latestValidBlockHeight)
      );

      const prepareSettlementTx = prepareBuilder.toTransaction(
        latestValidBlockHeight
      );
      const [signedAtaTxs, [signedPrepareSettlementTx]] = await convergence
        .identity()
        .signTransactionMatrix(ataTxs, [prepareSettlementTx]);

      await Promise.all(
        signedAtaTxs.map((signedTx) =>
          convergence
            .rpc()
            .serializeAndSendTransaction(signedTx, latestValidBlockHeight)
        )
      );

      const output = await convergence
        .rpc()
        .serializeAndSendTransaction(
          signedPrepareSettlementTx,
          latestValidBlockHeight
        );

      scope.throwIfCanceled();

      if (slicedLegAmount < legAmountToPrepare) {
        let prepareMoreLegsSlicedLegAmount =
          legAmountToPrepare - slicedLegAmount;

        let prepareMoreBuilder = await prepareMoreLegsSettlementBuilder(
          convergence,
          {
            ...operation.input,
            legAmountToPrepare: prepareMoreLegsSlicedLegAmount,
            sidePreparedLegs: slicedLegAmount,
          },
          scope
        );

        while (!prepareMoreBuilder.checkTransactionFits()) {
          const halvedLegAmount = Math.trunc(
            prepareMoreLegsSlicedLegAmount / 2
          );

          prepareMoreBuilder = await prepareMoreLegsSettlementBuilder(
            convergence,
            {
              ...operation.input,
              sidePreparedLegs: slicedLegAmount,
              legAmountToPrepare: halvedLegAmount,
            },
            scope
          );
          prepareMoreLegsSlicedLegAmount = halvedLegAmount;
        }

        await prepareMoreBuilder.sendAndConfirm(convergence, confirmOptions);
        scope.throwIfCanceled();

        let prepareMoreSidePrepared = 0;

        if (
          prepareMoreLegsSlicedLegAmount <
          legAmountToPrepare - slicedLegAmount
        ) {
          while (
            slicedLegAmount +
              prepareMoreLegsSlicedLegAmount +
              prepareMoreSidePrepared <
              legAmountToPrepare &&
            legAmountToPrepare -
              slicedLegAmount -
              prepareMoreLegsSlicedLegAmount >
              0
          ) {
            const amountToPrepare =
              legAmountToPrepare -
              slicedLegAmount -
              prepareMoreLegsSlicedLegAmount -
              prepareMoreSidePrepared;

            const prepareMoreBuilder = await prepareMoreLegsSettlementBuilder(
              convergence,
              {
                ...operation.input,
                sidePreparedLegs:
                  slicedLegAmount +
                  prepareMoreLegsSlicedLegAmount +
                  prepareMoreSidePrepared,
                legAmountToPrepare: amountToPrepare,
              },
              scope
            );

            await prepareMoreBuilder.sendAndConfirm(
              convergence,
              confirmOptions
            );

            prepareMoreSidePrepared += amountToPrepare;
          }
        }
      }

      return { response: output };
    },
  };
