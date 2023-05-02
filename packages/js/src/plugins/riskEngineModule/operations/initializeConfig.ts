import { createInitializeConfigInstruction } from '@convergence-rfq/risk-engine';

import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { Config } from '../models';
import {
  DEFAULT_MINT_DECIMALS,
  DEFAULT_COLLATERAL_FOR_FIXED_QUOTE_AMOUNT_RFQ,
  DEFAULT_SAFETY_PRICE_SHIFT_FACTOR,
  DEFAULT_OVERALL_SAFETY_FACTOR,
  DEFAULT_COLLATERAL_FOR_VARIABLE_SIZE_RFQ,
  DEFAULT_ACCEPTED_ORACLE_STALENESS,
  DEFAULT_ACCEPTED_ORACLE_CONFIDENCE_INTERVAL_PORTION,
} from '../constants';
import { Convergence } from '../../../Convergence';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
  Signer,
} from '../../../types';
import { TransactionBuilder, TransactionBuilderOptions } from '../../../utils';

const Key = 'InitalizeConfigOperation' as const;

/**
 * Add an BaseAsset
 *
 * ```ts
 * await convergence
 *   .riskEngine()
 *   .initializeConfig({ address };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const initializeConfigOperation =
  useOperation<InitalizeConfigOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type InitalizeConfigOperation = Operation<
  typeof Key,
  InitializeConfigInput,
  InitializeConfigOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type InitializeConfigInput =
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
      acceptedOracleConfidenceIntervalPortion: number;
    }
  | undefined;

/**
 * @group Operations
 * @category Outputs
 */
export type InitializeConfigOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const initializeConfigOperationHandler: OperationHandler<InitalizeConfigOperation> =
  {
    handle: async (
      operation: InitalizeConfigOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<InitializeConfigOutput> => {
      scope.throwIfCanceled();

      const builder = initializeConfigBuilder(
        convergence,
        operation.input,
        scope
      );
      const { response } = await builder.sendAndConfirm(
        convergence,
        scope.confirmOptions
      );

      return { response };
    },
  };

/**
 * @group Transaction Builders
 * @category Inputs
 */
export type InitalizeConfigBuilderParams = InitializeConfigInput;

/**
 * Adds an BaseAsset
 *
 * ```ts
 * const transactionBuilder = convergence
 *   .rfqs()
 *   .builders()
 *   .initializeConfig({ address });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const initializeConfigBuilder = (
  convergence: Convergence,
  params: InitalizeConfigBuilderParams,
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
    acceptedOracleStaleness = DEFAULT_ACCEPTED_ORACLE_STALENESS,
    acceptedOracleConfidenceIntervalPortion = DEFAULT_ACCEPTED_ORACLE_CONFIDENCE_INTERVAL_PORTION,
  } = params ?? {};

  const riskEngineProgram = convergence.programs().getRiskEngine(programs);
  const systemProgram = convergence.programs().getSystem(programs);

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .add({
      instruction: createInitializeConfigInstruction(
        {
          authority: authority.publicKey,
          protocol: convergence.protocol().pdas().protocol(),
          config: convergence.riskEngine().pdas().config(),
          systemProgram: systemProgram.address,
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
      key: 'initializeConfig',
    });
};
