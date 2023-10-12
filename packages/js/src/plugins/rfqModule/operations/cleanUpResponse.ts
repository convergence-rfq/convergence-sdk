import { createCleanUpResponseInstruction } from '@convergence-rfq/rfq';
import { PublicKey } from '@solana/web3.js';

import { Convergence } from '../../../Convergence';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '../../../types';
import { TransactionBuilder, TransactionBuilderOptions } from '../../../utils';
import { SendAndConfirmTransactionResponse } from '@/plugins';

const Key = 'cleanUpResponseOperation' as const;

/**
 * Cleans up Rfq response.
 *
 * ```ts
 * await convergence
 *   .rfqs()
 *   .cleanUpResponse({
 *     rfq: <publicKey>,
 *     response: <publicKey>,
 *     firstToPrepare: <publicKey>
 *   });
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
  /**
   * The address of the reponse accounts.
   */
  response: PublicKey;
};

/**
 * @group Operations
 * @category Outputs
 */
export type CleanUpResponseOutput = {
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
    ) => {
      const builder = await cleanUpResponseBuilder(
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

      return output;
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
 *   .cleanUpResponses({ responses: [<address>, <address>] });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const cleanUpResponseBuilder = async (
  convergence: Convergence,
  params: CleanUpResponseBuilderParams,
  options: TransactionBuilderOptions = {}
) => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const { response } = params;

  const rfqProgram = convergence.programs().getRfq(programs);

  const responseModel = await convergence
    .rfqs()
    .findResponseByAddress({ address: response });

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .add({
      instruction: createCleanUpResponseInstruction(
        {
          maker: responseModel.maker,
          rfq: responseModel.rfq,
          response: responseModel.address,
        },
        rfqProgram.address
      ),
      signers: [],
      key: 'cleanUpResponses',
    });
};
