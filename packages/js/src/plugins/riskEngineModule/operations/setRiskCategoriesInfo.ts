import {
  createSetRiskCategoriesInfoInstruction,
  RiskCategoryChange,
} from '@convergence-rfq/risk-engine';
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

const Key = 'SetRiskCategoriesInfoOperation' as const;

/**
 * Set instrument type
 *
 * ```ts
 * await convergence
 *   .riskEngine()
 *   .SetRiskCategoriesInfo({ ... };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const setRiskCategoriesInfoOperation =
  useOperation<SetRiskCategoriesInfoOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type SetRiskCategoriesInfoOperation = Operation<
  typeof Key,
  SetRiskCategoriesInfoInput,
  SetRiskCategoriesInfoOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type SetRiskCategoriesInfoInput = {
  /**
   * The owner of the protocol.
   */
  authority?: Signer;

  changes: RiskCategoryChange[];
};

/**
 * @group Operations
 * @category Outputs
 */
export type SetRiskCategoriesInfoOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const setRiskCategoriesInfoOperationHandler: OperationHandler<SetRiskCategoriesInfoOperation> =
  {
    handle: async (
      operation: SetRiskCategoriesInfoOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<SetRiskCategoriesInfoOutput> => {
      scope.throwIfCanceled();
      return SetRiskCategoriesInfoBuilder(
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
export type SetRiskCategoriesInfoBuilderParams = SetRiskCategoriesInfoInput;

/**
 * Adds an BaseAsset
 *
 * ```ts
 * const transactionBuilder = convergence
 *   .riskEngine()
 *   .builders()
 *   .setRiskCategoriesInfo({ changes });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const SetRiskCategoriesInfoBuilder = (
  convergence: Convergence,
  params: SetRiskCategoriesInfoBuilderParams,
  options: TransactionBuilderOptions = {}
): TransactionBuilder => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const { authority = payer, changes } = params;

  const riskEngineProgram = convergence.programs().getRiskEngine(programs);

  const config = convergence.riskEngine().pdas().config();
  const protocol = convergence.protocol().pdas().protocol();

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .add({
      instruction: createSetRiskCategoriesInfoInstruction(
        {
          authority: authority.publicKey,
          protocol,
          config,
        },
        { changes },
        riskEngineProgram.address
      ),
      signers: [authority],
      key: 'setRiskCategoriesInfo',
    });
};
