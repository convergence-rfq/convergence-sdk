import { createCleanUpRfqInstruction } from '@convergence-rfq/rfq';
import { PublicKey, Transaction } from '@solana/web3.js';

import { Convergence } from '../../../Convergence';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
  makeConfirmOptionsFinalizedOnMainnet,
} from '../../../types';
import {
  TransactionBuilder,
  TransactionBuilderOptions,
} from '../../../utils/TransactionBuilder';

const Key = 'CleanUpMultipleRfqOperation' as const;

/**
 * Cleans up an Rfq.
 *
 * ```ts
 *
 * const { rfq } = await convergence.rfqs.create(...);
 *
 * await convergence
 *   .rfqs()
 *   .cleanUpRfq({
 *     rfq: rfq.address
 *   });
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const cleanUpMultipleRfqOperation =
  useOperation<CleanUpMultipleRfqOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type CleanUpMultipleRfqOperation = Operation<
  typeof Key,
  CleanUpMultipleRfqInput,
  CleanUpMultipleRfqOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type CleanUpMultipleRfqInput = {
  /** The protocol address.
   * @defaultValue `convergence.protocol().pdas().protocol()`
   */
  protocol?: PublicKey;

  /** The address of the Rfq account. */
  rfqs: PublicKey[];
};

/**
 * @group Operations
 * @category Outputs
 */
export type CleanUpMultipleRfqOutput = {};

/**
 * @group Operations
 * @category Handlers
 */
export const cleanUpMultipleRfqOperationHandler: OperationHandler<CleanUpMultipleRfqOperation> =
  {
    handle: async (
      operation: CleanUpMultipleRfqOperation,
      convergence: Convergence,
      scope: OperationScope
    ) => {
      scope.throwIfCanceled();

      const txArray = await cleanUpMultipleRfqBuilder(
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
      const signedTnxs = await convergence
        .identity()
        .signAllTransactions(txArray);

      for (const tx of signedTnxs) {
        await convergence.rpc().serializeAndSendTransaction(tx, confirmOptions);
      }
      scope.throwIfCanceled();
    },
  };

/**
 * @group Transaction Builders
 * @category Inputs
 */
export type CleanUpMultipleRfqBuilderParams = CleanUpMultipleRfqInput;

/**
 * Cancels an existing Response.
 *
 * ```ts
 * const transactionBuilder = convergence
 * .rfqs()
 * .builders()
 * .cleanUpRfq({ address });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const cleanUpMultipleRfqBuilder = async (
  convergence: Convergence,
  params: CleanUpMultipleRfqBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<Transaction[]> => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const { rfqs } = params;

  const rfqProgram = convergence.programs().getRfq(programs);
  const txArray: Transaction[] = [];
  for (const rfq of rfqs) {
    const rfqModel = await convergence
      .rfqs()
      .findRfqByAddress({ address: rfq });
    const txBuilder = TransactionBuilder.make()
      .setFeePayer(payer)
      .add({
        instruction: createCleanUpRfqInstruction(
          {
            taker: rfqModel.taker,
            protocol: convergence.protocol().pdas().protocol(),
            rfq,
          },
          rfqProgram.address
        ),
        signers: [],
        key: 'cleanUpRfq',
      });
    const blockHashWithBlockHeight = await convergence
      .rpc()
      .getLatestBlockhash();
    const tx = txBuilder.toTransaction(blockHashWithBlockHeight);
    txArray.push(tx);
  }

  return txArray;
  // for (const rfq of rfqs) {
  //   const tx = new Transaction();
  //   tx.add(
  //     createCleanUpRfqInstruction(
  //       {
  //         taker,
  //         protocol: convergence.protocol().pdas().protocol(),
  //         rfq,
  //       },
  //       rfqProgram.address
  //     )
  //   );
  //   tx.feePayer = payer.publicKey;
  //   tx.recentBlockhash = (
  //     await convergence.rpc().getLatestBlockhash()
  //   ).blockhash;
  //   txArray.push(tx);
  // }
  // return txArray;
};
