import { createFinalizeRfqConstructionInstruction } from '@convergence-rfq/rfq';
import { PublicKey } from '@solana/web3.js';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { TransactionBuilder, TransactionBuilderOptions } from '@/utils';
import {
  makeConfirmOptionsFinalizedOnMainnet,
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
  Signer,
} from '@/types';
import { Convergence } from '@/Convergence';

const Key = 'FinalizeRfqConstructionOperation' as const;

/**
 * Finalizes construction of an Rfq.
 *
 * ```ts
 * const { rfq } = await convergence
 *   .rfqs()
 *   .create();
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const finalizeRfqConstructionOperation =
  useOperation<FinalizeRfqConstructionOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type FinalizeRfqConstructionOperation = Operation<
  typeof Key,
  FinalizeRfqConstructionInput,
  FinalizeRfqConstructionOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type FinalizeRfqConstructionInput = {
  /**
   * The taker of the Rfq to create.
   *
   * @defaultValue `convergence.identity().publicKey`
   */
  taker?: Signer;
  /** The address of the protocol account */
  protocol: PublicKey;
  /** The address of the Rfq account */
  rfq: PublicKey;
  /** The address of the Taker's collateral_info account */
  collateralInfo: PublicKey;
  /** The address of the Taker's collateral_token account */
  collateralToken: PublicKey;
  /** The address of the risk_engine account */
  riskEngine: PublicKey;
};

/**
 * @group Operations
 * @category Outputs
 */
export type FinalizeRfqConstructionOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const finalizeRfqConstructionOperationHandler: OperationHandler<FinalizeRfqConstructionOperation> =
  {
    handle: async (
      operation: FinalizeRfqConstructionOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<FinalizeRfqConstructionOutput> => {
      const builder = await finalizeRfqConstructionBuilder(
        convergence,
        {
          ...operation.input,
        },
        scope
      );
      scope.throwIfCanceled();

      const confirmOptions = makeConfirmOptionsFinalizedOnMainnet(
        convergence,
        scope.confirmOptions
      );
      const output = await builder.sendAndConfirm(convergence, confirmOptions);
      scope.throwIfCanceled();

      return { ...output };
    },
  };

/**
 * @group Transaction Builders
 * @category Inputs
 */
export type FinalizeRfqConstructionBuilderParams = FinalizeRfqConstructionInput;

/**
 * @group Transaction Builders
 * @category Contexts
 */
export type FinalizeRfqConstructionBuilderContext =
  SendAndConfirmTransactionResponse;

/**
 * Finalizes an Rfq.
 *
 * ```ts
 * const transactionBuilder = await convergence
 *   .rfqs()
 *   .builders()
 *   .create();
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const finalizeRfqConstructionBuilder = async (
  convergence: Convergence,
  params: FinalizeRfqConstructionBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<TransactionBuilder<FinalizeRfqConstructionBuilderContext>> => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;

  const {
    taker = convergence.identity(),
    protocol,
    rfq,
    collateralInfo,
    collateralToken,
    riskEngine,
  } = params;

  const rfqProgram = convergence.programs().getRfq(programs);

  return TransactionBuilder.make<FinalizeRfqConstructionBuilderContext>()
    .setFeePayer(payer)
    .add({
      instruction: createFinalizeRfqConstructionInstruction(
        {
          taker: taker.publicKey,
          protocol,
          rfq,
          collateralInfo,
          collateralToken,
          riskEngine,
        },
        rfqProgram.address
      ),
      signers: [taker],
      key: 'finalizeRfqConstruction',
    });
};
