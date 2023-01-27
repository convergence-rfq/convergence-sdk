import { PublicKey } from '@solana/web3.js';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { Convergence } from '@/Convergence';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
  Signer,
  makeConfirmOptionsFinalizedOnMainnet,
} from '@/types';
// import { TransactionBuilder } from '@/utils';
import { prepareSettlementBuilder } from './prepareSettlement';
import { prepareMoreLegsSettlementBuilder } from './prepareMoreLegsSettlement';

const Key = 'PrepareSettlementAndPrepareMoreLegsOperation' as const;

/**
 * Prepares for settlement and prepares more legs for settlement.
 *
 * ```ts
 * await convergence
 *   .rfqs()
 *   .prepareSettlementAndPrepareMoreLegs({ caller, rfq, response, legAmountToPrepare };
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
   * The caller to prepare settlement of the Rfq
   *
   * @defaultValue `convergence.identity()`
   */
  caller?: Signer;

  /** The address of the protocol */
  protocol?: PublicKey;

  /** The address of the Rfq account */
  rfq: PublicKey;

  /** The address of the response account */
  response: PublicKey;

  /*
   * Args
   */

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
      //   let prepareCounter: number = 0;

      const { caller = convergence.identity(), legAmountToPrepare } =
        operation.input;
      const MAX_TX_SIZE = 1232;

      let prepareBuilder = await prepareSettlementBuilder(
        convergence,
        {
          ...operation.input,
        },
        scope
      );
      scope.throwIfCanceled();

      let txSize = await convergence
        .rpc()
        .getTransactionSize(prepareBuilder, [caller]);

      let slicedLegAmount = legAmountToPrepare;

      while (txSize == -1 || txSize + 193 > MAX_TX_SIZE) {
        console.log('prepareTxSize too big x1');

        const halvedLegAmount = Math.trunc(slicedLegAmount / 2);

        prepareBuilder = await prepareSettlementBuilder(
          convergence,
          {
            ...operation.input,
            legAmountToPrepare: halvedLegAmount,
          },
          scope
        );

        txSize = await convergence
          .rpc()
          .getTransactionSize(prepareBuilder, [caller]);

        slicedLegAmount = halvedLegAmount;
        console.log('sliced leg amt: ' + slicedLegAmount.toString());
      }

      const confirmOptions = makeConfirmOptionsFinalizedOnMainnet(
        convergence,
        scope.confirmOptions
      );

      const output = await prepareBuilder.sendAndConfirm(
        convergence,
        confirmOptions
      );
      scope.throwIfCanceled();

      //@ts-ignore
      let prepareMoreTxSize: number = 0;

      if (slicedLegAmount < legAmountToPrepare) {
        console.log(
          'hit first if-statement: if slicedLegAmount < legAmountToPrepare'
        );
        let prepareMoreLegsSlicedLegAmount =
          legAmountToPrepare - slicedLegAmount;

        console.log(
          'prepareMoreLegsSlicedLegAmount: ' +
            prepareMoreLegsSlicedLegAmount.toString()
        );

        let prepareMoreBuilder = await prepareMoreLegsSettlementBuilder(
          convergence,
          {
            ...operation.input,
            legAmountToPrepare: prepareMoreLegsSlicedLegAmount,
            sidePreparedLegs: slicedLegAmount,
          },
          scope
        );

        prepareMoreTxSize = await convergence
          .rpc()
          .getTransactionSize(prepareMoreBuilder, [caller]);

        while (
          prepareMoreTxSize == -1 ||
          prepareMoreTxSize + 193 > MAX_TX_SIZE
        ) {
          console.log('prepareMoreTxSize too big x1');

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

          prepareMoreTxSize = await convergence
            .rpc()
            .getTransactionSize(prepareMoreBuilder, [caller]);

          prepareMoreLegsSlicedLegAmount = halvedLegAmount;

          console.log(
            ' prepareMoreLegsSlicedLegAmount: ' +
              prepareMoreLegsSlicedLegAmount.toString()
          );
        }

        await prepareMoreBuilder.sendAndConfirm(convergence, confirmOptions);
        scope.throwIfCanceled();

        let x = prepareMoreLegsSlicedLegAmount;
        let sidePrepared = 0;

        if (
          prepareMoreLegsSlicedLegAmount <
          legAmountToPrepare - slicedLegAmount
        ) {
          while (
            slicedLegAmount + prepareMoreLegsSlicedLegAmount + sidePrepared <
              legAmountToPrepare &&
            legAmountToPrepare -
              slicedLegAmount -
              prepareMoreLegsSlicedLegAmount >
              0
          ) {
            let ins =
              legAmountToPrepare -
              slicedLegAmount -
              prepareMoreLegsSlicedLegAmount -
              sidePrepared;

            console.log(
              'side prepared legs: ' +
                (
                  slicedLegAmount +
                  prepareMoreLegsSlicedLegAmount +
                  sidePrepared
                ).toString()
            );
            console.log('leg amt to prepare (ins): ' + ins.toString());
            console.log('slicedLegAmount: ' + slicedLegAmount.toString());
            console.log('x: ' + x.toString());
            console.log(
              'preapreMoreLegsSlicedAmt: ' +
                prepareMoreLegsSlicedLegAmount.toString()
            );

            //@ts-ignore
            const prepareMoreBuilder = await prepareMoreLegsSettlementBuilder(
              convergence,
              {
                ...operation.input,
                sidePreparedLegs:
                  slicedLegAmount +
                  prepareMoreLegsSlicedLegAmount +
                  sidePrepared,
                legAmountToPrepare: ins,
              },
              scope
            );

            await prepareMoreBuilder.sendAndConfirm(
              convergence,
              confirmOptions
            );

            // x += ins;
            sidePrepared += ins;
          }
        }
      }

      return { ...output };
    },
  };
