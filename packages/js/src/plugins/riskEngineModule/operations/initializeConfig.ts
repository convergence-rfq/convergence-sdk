import {
  createInitializeConfigInstruction,
  Fraction,
} from '@convergence-rfq/risk-engine';
import { PublicKey } from '@solana/web3.js';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { Convergence } from '@/Convergence';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
  Signer,
  toBigNumber,
  toFractional,
} from '@/types';
import { TransactionBuilder, TransactionBuilderOptions } from '@/utils';

const Key = 'InitalizeConfigOperation' as const;

const DEFAULT_COLLATERAL_FOR_VARIABLE_SIZE_RFQ = toBigNumber(1_000_000_000);
const DEFAULT_COLLATERAL_FOR_FIXED_QUOTE_AMOUNT_RFQ =
  toBigNumber(2_000_000_000);
const DEFAULT_MINT_DECIMALS = 9;
const DEFAULT_SAFETY_PRICE_SHIFT_FACTOR = toFractional(1, 2);
const DEFAULT_OVERALL_SAFETY_FACTOR = toFractional(1, 1);

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
      /**
       * The owner of the protocol.
       */
      authority?: Signer;

      /*
       * ARGS
       */
      collateralForVariableSizeRfqCreation?: number;

      collateralForFixedQuoteAmountRfqCreation?: number;

      collateralMintDecimals?: number;

      safetyPriceShiftFactor?: Fraction;

      overallSafetyFactor?: Fraction;
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

      return initializeConfigBuilder(
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
  } = params ?? {};

  const riskEngineProgram = convergence.programs().getRiskEngine(programs);
  const systemProgram = convergence.programs().getSystem(programs);

  const [config] = PublicKey.findProgramAddressSync(
    [Buffer.from('config')],
    riskEngineProgram.address
  );

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .add({
      instruction: createInitializeConfigInstruction(
        {
          signer: authority.publicKey,
          config,
          systemProgram: systemProgram.address,
        },
        {
          collateralForVariableSizeRfqCreation,
          collateralForFixedQuoteAmountRfqCreation,
          collateralMintDecimals,
          safetyPriceShiftFactor,
          overallSafetyFactor,
        },
        riskEngineProgram.address
      ),
      signers: [authority],
      key: 'initializeConfig',
    });
};
