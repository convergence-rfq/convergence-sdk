import { createCleanUpRfqInstruction } from '@convergence-rfq/rfq';
import { PublicKey } from '@solana/web3.js';

import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { Convergence } from '../../../Convergence';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '../../../types';
import { TransactionBuilder, TransactionBuilderOptions } from '../../../utils';

const Key = 'CleanUpRfqOperation' as const;

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
export const cleanUpRfqOperation = useOperation<CleanUpRfqOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type CleanUpRfqOperation = Operation<
  typeof Key,
  CleanUpRfqInput,
  CleanUpRfqOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type CleanUpRfqInput = {
  /** The address of the Rfq account. */
  rfq: PublicKey;

  /**
   * The Taker of the Rfq
   *
   *  @defaultValue `convergence.identity().publicKey`
   */
  taker?: PublicKey;

  /**
   * The protocol address.
   *
   * @defaultValue `convergence.protocol().pdas().protocol()`
   */
  protocol?: PublicKey;
};

/**
 * @group Operations
 * @category Outputs
 */
export type CleanUpRfqOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const cleanUpRfqOperationHandler: OperationHandler<CleanUpRfqOperation> =
  {
    handle: async (
      operation: CleanUpRfqOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<CleanUpRfqOutput> => {
      const builder = await cleanUpRfqBuilder(
        convergence,
        {
          ...operation.input,
        },
        scope
      );
      const output = await builder.sendAndConfirm(
        convergence,
        scope.confirmOptions
      );
      scope.throwIfCanceled();

      return { ...output };
    },
  };

/**
 * @group Transaction Builders
 * @category Inputs
 */
export type CleanUpRfqBuilderParams = CleanUpRfqInput;

/**
 * Cancels an existing Response.
 *
 * ```ts
 * const transactionBuilder = convergence
 *   .rfqs()
 *   .builders()
 *   .cleanUpRfq();
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const cleanUpRfqBuilder = async (
  convergence: Convergence,
  params: CleanUpRfqBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<TransactionBuilder> => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const { taker = convergence.identity().publicKey, rfq } = params;
  return TransactionBuilder.make()
    .setFeePayer(payer)
    .add({
      instruction: createCleanUpRfqInstruction(
        {
          taker,
          protocol: convergence.protocol().pdas().protocol(),
          rfq,
        },
        convergence.programs().getRfq(programs).address
      ),
      signers: [],
      key: 'cleanUpRfq',
    });
};
