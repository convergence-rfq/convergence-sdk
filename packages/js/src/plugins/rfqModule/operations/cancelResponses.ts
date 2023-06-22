import { createCancelResponseInstruction } from '@convergence-rfq/rfq';
import { PublicKey, Transaction } from '@solana/web3.js';

import { Convergence } from '../../../Convergence';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
  Signer,
} from '../../../types';
import { TransactionBuilder, TransactionBuilderOptions } from '../../../utils';
import { Response } from '../models/Response';

const Key = 'cancelResponsesOperation' as const;

/**
 * Cancel multiple response.
 *
 * ```ts
 * await convergence.rfqs().cancelResponses({ responses });
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const cancelResponsesOperation =
  useOperation<CancelResponsesOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type CancelResponsesOperation = Operation<
  typeof Key,
  CancelResponsesInput,
  CancelResponsesOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type CancelResponsesInput = {
  /**
   * The addresses of the reponses.
   */
  responses: PublicKey[] | Response[];

  /**
   * The maker as a signer.
   *
   * @defaultValue `convergence.identity()`
   */
  maker?: Signer;

  /**
   * The protocol address.
   *
   * @defaultValue `convergence.protocol().pdas().get()`
   */
  protocol?: PublicKey;
};

/**
 * @group Operations
 * @category Outputs
 */
export type CancelResponsesOutput = {};

/**
 * @group Operations
 * @category Handlers
 */
export const cancelResponsesOperationHandler: OperationHandler<CancelResponsesOperation> =
  {
    handle: async (
      operation: CancelResponsesOperation,
      convergence: Convergence,
      scope: OperationScope
    ) => {
      const builder = await cancelResponsesBuilder(
        convergence,
        {
          ...operation.input,
        },
        scope
      );

      const signedTxs = await convergence
        .identity()
        .signAllTransactions(builder);

      for (const signedTx of signedTxs) {
        await convergence
          .rpc()
          .serializeAndSendTransaction(signedTx, scope.confirmOptions);
      }

      scope.throwIfCanceled();
    },
  };

/**
 * @group Transaction Builders
 * @category Inputs
 */
export type CancelResponsesBuilderParams = CancelResponsesInput;

/**
 * Cancels an existing Response.
 *
 * ```ts
 * const builder = convergence.rfqs().builders().cancel({ responses });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const cancelResponsesBuilder = async (
  convergence: Convergence,
  params: CancelResponsesBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<Transaction[]> => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const { maker = convergence.identity(), responses } = params;

  const txs = Promise.all(
    responses.map(async (response) => {
      if (response instanceof PublicKey) {
        response = await convergence
          .rfqs()
          .findResponseByAddress({ address: response });
      }

      const rfq = await convergence
        .rfqs()
        .findRfqByAddress({ address: response.rfq });

      const tx = TransactionBuilder.make()
        .setFeePayer(payer)
        .add({
          instruction: createCancelResponseInstruction(
            {
              response: response.address,
              rfq: rfq.address,
              maker: response.maker,
              protocol: convergence.protocol().pdas().protocol(),
            },
            convergence.programs().getRfq(programs).address
          ),
          signers: [maker],
          key: 'cancelResponses',
        });
      const blockHashWithBlockHeight = await convergence
        .rpc()
        .getLatestBlockhash();
      return tx.toTransaction(blockHashWithBlockHeight);
    })
  );

  return txs;
};
