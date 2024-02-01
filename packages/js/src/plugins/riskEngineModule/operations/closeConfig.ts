import { createCloseConfigInstruction } from '@convergence-rfq/risk-engine';

import {
  TransactionBuilder,
  TransactionBuilderOptions,
} from '../../../utils/TransactionBuilder';
import { Convergence } from '../../../Convergence';
import {
  Operation,
  OperationHandler,
  OperationScope,
  Signer,
  useOperation,
} from '../../../types';
import { SendAndConfirmTransactionResponse } from '../../../plugins';
import { riskEngineConfigCache } from '../cache';

const Key = 'CloseConfigOperation' as const;

/**
 * Close current rist engine configuration.
 *
 * ```ts
 * await convergence.riskEngine().closeConfig();
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const closeConfigOperation = useOperation<CloseConfigOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type CloseConfigOperation = Operation<
  typeof Key,
  CloseConfigInput,
  CloseConfigOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type CloseConfigInput =
  | {
      /** The owner of the protocol. */
      authority?: Signer;
    }
  | undefined;

/**
 * @group Operations
 * @category Outputs
 */
export type CloseConfigOutput = {
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Transaction Builders
 * @category Inputs
 */
export type CloseConfigBuilderParams = CloseConfigInput;

/**
 * @group Operations
 * @category Handlers
 */
export const closeConfigOperationHandler: OperationHandler<CloseConfigOperation> =
  {
    handle: async (
      operation: CloseConfigOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<CloseConfigOutput> => {
      scope.throwIfCanceled();

      const builder = closeConfigBuilder(convergence, operation.input, scope);
      const { response } = await builder.sendAndConfirm(
        convergence,
        scope.confirmOptions
      );

      riskEngineConfigCache.clear();

      return { response };
    },
  };

/**
 * Closes risk engine configuration.
 *
 * ```ts
 * const transactionBuilder = convergence
 *   .rfqs()
 *   .builders()
 *   .closeConfig();
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const closeConfigBuilder = (
  convergence: Convergence,
  params: CloseConfigBuilderParams,
  options: TransactionBuilderOptions = {}
): TransactionBuilder => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const { authority = payer } = params ?? {};

  const riskEngineProgram = convergence.programs().getRiskEngine(programs);

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .addTxPriorityFeeIx(convergence)
    .add({
      instruction: createCloseConfigInstruction(
        {
          authority: authority.publicKey,
          protocol: convergence.protocol().pdas().protocol(),
          config: convergence.riskEngine().pdas().config(),
        },
        riskEngineProgram.address
      ),
      signers: [authority],
      key: 'closeConfig',
    });
};
