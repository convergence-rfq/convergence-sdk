import { createCleanUpResponseInstruction } from '@convergence-rfq/rfq';
import { PublicKey } from '@solana/web3.js';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { Convergence } from '@/Convergence';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '@/types';
import { TransactionBuilder, TransactionBuilderOptions } from '@/utils';

const Key = 'CleanUpResponseLegsOperation' as const;

/**
 * Cleans up a Response.
 *
 * ```ts
 * await convergence
 *   .rfqs()
 *   .cleanUpResponse({ address };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const cleanUpResponseOperation =
  useOperation<CleanUpResponseOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type CleanUpResponseOperation = Operation<
  typeof Key,
  CleanUpResponseInput,
  CleanUpResponseOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type CleanUpResponseInput = {
  /** The Maker of the Response */
  maker: PublicKey;

  firstToPrepareQuote: PublicKey;
  /**
   * The address of the protocol
   */
  protocol: PublicKey;
  /** The address of the Rfq account */
  rfq: PublicKey;
  /** The address of the Reponse account */
  response: PublicKey;
  /** The address of the quote escrow account.
   * Can be a valid escrow account or an unitialized account. */
  quoteEscrow: PublicKey;

  quoteBackupTokens: PublicKey;
};

/**
 * @group Operations
 * @category Outputs
 */
export type CleanUpResponseOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const cleanUpResponseOperationHandler: OperationHandler<CleanUpResponseOperation> =
  {
    handle: async (
      operation: CleanUpResponseOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<CleanUpResponseOutput> => {
      scope.throwIfCanceled();

      return cleanUpResponseBuilder(
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
export type CleanUpResponseBuilderParams = CleanUpResponseInput;

/**
 * Cleans up an existing Response.
 *
 * ```ts
 * const transactionBuilder = convergence
 *   .rfqs()
 *   .builders()
 *   .cleanUpResponse({ address });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const cleanUpResponseBuilder = (
  convergence: Convergence,
  params: CleanUpResponseBuilderParams,
  options: TransactionBuilderOptions = {}
): TransactionBuilder => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const { maker, protocol, rfq, response } = params;

  const rfqProgram = convergence.programs().getRfq(programs);

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .add({
      instruction: createCleanUpResponseInstruction(
        {
          maker,
          protocol,
          rfq,
          response,
        },
        rfqProgram.address
      ),
      signers: [],
      key: 'cleanUpResponse',
    });
};
