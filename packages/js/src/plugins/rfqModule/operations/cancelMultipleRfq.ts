import { createCancelRfqInstruction } from '@convergence-rfq/rfq';
import { PublicKey, Transaction } from '@solana/web3.js';

import { Convergence } from '../../../Convergence';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
  Signer,
} from '../../../types';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { TransactionBuilder, TransactionBuilderOptions } from '../../../utils';

const Key = 'CancelMultipleRfqOperation' as const;

/**
 * Cancels an existing Rfq.
 *
 * ```ts
 *
 * const { rfq } = await convergence.rfqs.create(...);
 *
 * await convergence
 *   .rfqs()
 *   .cancelMultipleRfq({ rfq: rfq.address });
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const cancelMultipleRfqOperation =
  useOperation<CancelMultipleRfqOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type CancelMultipleRfqOperation = Operation<
  typeof Key,
  CancelMultipleRfqInput,
  CancelMultipleRfqOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type CancelMultipleRfqInput = {
  /**
   * The Taker of the Rfq as a Signer.
   *
   * @defaultValue `convergence.identity()`
   */
  taker?: Signer;

  /**
   * The protocol address.
   *
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
export type CancelMultipleRfqOutput = {
  responses: SendAndConfirmTransactionResponse[];
};

/**
 * @group Operations
 * @category Handlers
 */
export const cancelMultipleRfqOperationHandler: OperationHandler<CancelMultipleRfqOperation> =
  {
    handle: async (
      operation: CancelMultipleRfqOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<CancelMultipleRfqOutput> => {
      const builders = await cancelMultipleRfqBuilder(
        convergence,
        operation.input,
        scope
      );

      const signedTxs = await convergence
        .identity()
        .signAllTransactions(builders);
      const responses = await Promise.all(
        signedTxs.map((signedTx) =>
          convergence
            .rpc()
            .serializeAndSendTransaction(signedTx, scope.confirmOptions)
        )
      );
      scope.throwIfCanceled();

      return { responses };
    },
  };

/**
 * @group Transaction Builders
 * @category Inputs
 */
export type CancelMultipleRfqBuilderParams = CancelMultipleRfqInput;

/**
 * Cancels an existing Rfq.
 *
 * ```ts
 * const transactionBuilder = convergence
 *   .rfqs()
 *   .builders()
 *   .cancel({ address });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const cancelMultipleRfqBuilder = async (
  convergence: Convergence,
  params: CancelMultipleRfqBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<Transaction[]> => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const { rfqs, taker = convergence.identity() } = params;

  const rfqProgram = convergence.programs().getRfq(programs);
  const txArray: Transaction[] = [];
  for (const rfq of rfqs) {
    const rfqModel = await convergence
      .rfqs()
      .findRfqByAddress({ address: rfq });
    const txBuilder = TransactionBuilder.make()
      .setFeePayer(payer)
      .add({
        instruction: createCancelRfqInstruction(
          {
            taker: rfqModel.taker,
            protocol: convergence.protocol().pdas().protocol(),
            rfq,
          },
          rfqProgram.address
        ),
        signers: [taker],
        key: 'cancelMultipleRfqOperation',
      });
    const blockHashWithBlockHeight = await convergence
      .rpc()
      .getLatestBlockhash();
    const tx = txBuilder.toTransaction(blockHashWithBlockHeight);
    txArray.push(tx);
  }

  return txArray;
};
