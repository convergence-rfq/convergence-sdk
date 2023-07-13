import { createUpdateConfigInstruction } from '@convergence-rfq/risk-engine';

import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { Config } from '../models';
import {
  DEFAULT_MINT_DECIMALS,
  DEFAULT_COLLATERAL_FOR_FIXED_QUOTE_AMOUNT_RFQ,
  DEFAULT_SAFETY_PRICE_SHIFT_FACTOR,
  DEFAULT_OVERALL_SAFETY_FACTOR,
  DEFAULT_COLLATERAL_FOR_VARIABLE_SIZE_RFQ,
  DEFAULT_ORACLE_STALENESS,
  DEFAULT_ACCEPTED_ORACLE_CONFIDENCE_INTERVAL_POSITION,
} from '../constants';
import { Convergence } from '../../../Convergence';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
  Signer,
} from '../../../types';
import {
  TransactionBuilder,
  TransactionBuilderOptions,
} from '../../../utils/TransactionBuilder';
import { riskEngineConfigCache } from '../cache';

const Key = 'UpdateConfigOperation' as const;

/**
 * Update risk engine config
 *
 * ```ts
 * await convergence
 *   .riskEngine()
 *   .updateConfig({ ... };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const updateConfigOperation = useOperation<UpdateConfigOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type UpdateConfigOperation = Operation<
  typeof Key,
  UpdateConfigInput,
  UpdateConfigOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type UpdateConfigInput =
  | {
      /** The owner of the protocol. */
      authority?: Signer;

      /** The collateral amount required to create a variable size RFQ. */
      collateralForVariableSizeRfqCreation?: number;

      /** The collateral amount required to create a fixed quote amount RFQ. */
      collateralForFixedQuoteAmountRfqCreation?: number;

      /** The number of decimals of the collateral mint. */
      collateralMintDecimals?: number;

      /** The safety price shift factor. */
      safetyPriceShiftFactor?: number;

      /** The overall safety factor. */
      overallSafetyFactor?: number;

      /** The accepted oracle staleness. */
      acceptedOracleStaleness?: number;

      /** The accepted oracle confidence interval portion. */
      acceptedOracleConfidenceIntervalPortion?: number;
    }
  | undefined;

/**
 * @group Operations
 * @category Outputs
 */
export type UpdateConfigOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;

  /** Risk engine config model. */
  config: Config;
};

/**
 * @group Operations
 * @category Handlers
 */
export const updateConfigOperationHandler: OperationHandler<UpdateConfigOperation> =
  {
    handle: async (
      operation: UpdateConfigOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<UpdateConfigOutput> => {
      scope.throwIfCanceled();

      const builder = updateConfigBuilder(convergence, operation.input, scope);
      const { response } = await builder.sendAndConfirm(
        convergence,
        scope.confirmOptions
      );

      riskEngineConfigCache.clear();
      const config = await convergence.riskEngine().fetchConfig(scope);

      return { response, config };
    },
  };

/**
 * @group Transaction Builders
 * @category Inputs
 */
export type UpdateConfigBuilderParams = UpdateConfigInput;

/**
 * Updates risk engine config
 *
 * ```ts
 * const transactionBuilder = convergence
 *   .riskEngine()
 *   .builders()
 *   .updateConfig({ ... });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const updateConfigBuilder = (
  convergence: Convergence,
  params: UpdateConfigBuilderParams,
  options: TransactionBuilderOptions = {}
): TransactionBuilder => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const {
    authority = payer,
    collateralForVariableSizeRfqCreation = DEFAULT_COLLATERAL_FOR_VARIABLE_SIZE_RFQ,
    collateralForFixedQuoteAmountRfqCreation = DEFAULT_COLLATERAL_FOR_FIXED_QUOTE_AMOUNT_RFQ,
    collateralMintDecimals = DEFAULT_MINT_DECIMALS,
    safetyPriceShiftFactor = DEFAULT_SAFETY_PRICE_SHIFT_FACTOR,
    overallSafetyFactor = DEFAULT_OVERALL_SAFETY_FACTOR,
    acceptedOracleStaleness = DEFAULT_ORACLE_STALENESS,
    acceptedOracleConfidenceIntervalPortion = DEFAULT_ACCEPTED_ORACLE_CONFIDENCE_INTERVAL_POSITION,
  } = params ?? {};

  const riskEngineProgram = convergence.programs().getRiskEngine(programs);

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .add({
      instruction: createUpdateConfigInstruction(
        {
          authority: authority.publicKey,
          protocol: convergence.protocol().pdas().protocol(),
          config: convergence.riskEngine().pdas().config(),
        },
        {
          collateralForVariableSizeRfqCreation,
          collateralForFixedQuoteAmountRfqCreation,
          collateralMintDecimals,
          safetyPriceShiftFactor,
          overallSafetyFactor,
          acceptedOracleStaleness,
          acceptedOracleConfidenceIntervalPortion,
        },
        riskEngineProgram.address
      ),
      signers: [authority],
      key: 'updateConfig',
    });
};
