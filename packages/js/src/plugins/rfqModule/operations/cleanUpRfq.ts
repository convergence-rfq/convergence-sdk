import { createCleanUpRfqInstruction } from '@convergence-rfq/rfq';
import { PublicKey } from '@solana/web3.js';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { Convergence } from '@/Convergence';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
  Signer,
} from '@/types';
import { TransactionBuilder, TransactionBuilderOptions } from '@/utils';

const Key = 'CleanUpRfqOperation' as const;

/**
 * Cleans up an Rfq.
 *
 * ```ts
 * await convergence
 *   .rfqs()
 *   .cleanUpRfq({ address };
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
  /**
   * The Taker as a Signer
   *
   * @defaultValue `convergence.identity()`
   */
  taker?: Signer;

  /**
   * The address of the protocol
   */
  protocol: PublicKey;

  /** The address of the Rfq account */
  rfq: PublicKey;
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
      scope.throwIfCanceled();

      return cleanUpRfqBuilder(
        convergence,
        operation.input,
        scope
      ).sendAndConfirm(convergence, scope.confirmOptions);
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
 *   .cleanUpRfq({ address });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const cleanUpRfqBuilder = (
  convergence: Convergence,
  params: CleanUpRfqBuilderParams,
  options: TransactionBuilderOptions = {}
): TransactionBuilder => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const { taker = convergence.identity(), protocol, rfq } = params;

  const rfqProgram = convergence.programs().getRfq(programs);

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .add({
      instruction: createCleanUpRfqInstruction(
        {
          taker: taker.publicKey,
          protocol,
          rfq,
        },
        rfqProgram.address
      ),
      signers: [taker],
      key: 'cleanUpRfq',
    });
};
