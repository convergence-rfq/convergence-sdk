import { createCleanUpResponseLegsInstruction } from '@convergence-rfq/rfq';
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
 * Cleans up Legs for a Response
 *
 * ```ts
 * await convergence
 *   .rfqs()
 *   .cleanUpResponseLegs({ address };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const cleanUpResponseLegsOperation =
  useOperation<CleanUpResponseLegsOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type CleanUpResponseLegsOperation = Operation<
  typeof Key,
  CleanUpResponseLegsInput,
  CleanUpResponseLegsOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type CleanUpResponseLegsInput = {
  /**
   * The address of the protocol
   */
  protocol: PublicKey;
  /** The address of the Rfq account */
  rfq: PublicKey;
  /** The address of the Reponse account */
  response: PublicKey;

  /*
   * Args
   */

  legAmountToClear: number;
};

/**
 * @group Operations
 * @category Outputs
 */
export type CleanUpResponseLegsOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const cleanUpResponseLegsOperationHandler: OperationHandler<CleanUpResponseLegsOperation> =
  {
    handle: async (
      operation: CleanUpResponseLegsOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<CleanUpResponseLegsOutput> => {
      scope.throwIfCanceled();

      return cleanUpResponseLegsBuilder(
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
export type CleanUpResponseLegsBuilderParams = CleanUpResponseLegsInput;

/**
 * Cleans up Legs for a Response.
 *
 * ```ts
 * const transactionBuilder = convergence
 *   .rfqs()
 *   .builders()
 *   .cleanUpResponseLegs({ address });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const cleanUpResponseLegsBuilder = (
  convergence: Convergence,
  params: CleanUpResponseLegsBuilderParams,
  options: TransactionBuilderOptions = {}
): TransactionBuilder => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const { protocol, rfq, response, legAmountToClear } = params;

  const rfqProgram = convergence.programs().getRfq(programs);

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .add({
      instruction: createCleanUpResponseLegsInstruction(
        {
          protocol,
          rfq,
          response,
        },
        {
          legAmountToClear,
        },
        rfqProgram.address
      ),
      signers: [],
      key: 'cleanUpResponseLegs',
    });
};
