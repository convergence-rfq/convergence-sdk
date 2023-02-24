import {
  createSetRiskCategoriesInfoInstruction,
  RiskCategoryChange,
} from '@convergence-rfq/risk-engine';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { assertConfig, Config, toConfig } from '../models';
import { toConfigAccount } from '../accounts';
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

  /** The risk category changes. */
  changes: RiskCategoryChange[];
};

/**
 * @group Operations
 * @category Outputs
 */
export type SetRiskCategoriesInfoOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;

  /** Risk engine config. */
  config: Config;
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
      const { commitment } = scope;
      scope.throwIfCanceled();

      const builder = setRiskCategoriesInfoBuilder(
        convergence,
        operation.input,
        scope
      );
      const { response } = await builder.sendAndConfirm(
        convergence,
        scope.confirmOptions
      );

      const account = await convergence
       .rpc()
       .getAccount(convergence.riskEngine().pdas().config(), commitment);
      const config = toConfig(toConfigAccount(account));
      scope.throwIfCanceled();
      assertConfig(config);

      return { response, config };
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
export const setRiskCategoriesInfoBuilder = (
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
