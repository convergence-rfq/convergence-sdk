import { createFinalizeRfqConstructionInstruction } from '@convergence-rfq/rfq';
import { ComputeBudgetProgram, PublicKey } from '@solana/web3.js';

import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { assertRfq, Rfq } from '../models';
import {
  TransactionBuilder,
  TransactionBuilderOptions,
} from '../../../utils/TransactionBuilder';
import {
  makeConfirmOptionsFinalizedOnMainnet,
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
  Signer,
} from '../../../types';
import { Convergence } from '../../../Convergence';
import { LegInstrument } from '@/plugins/instrumentModule';
import { PrintTradeLeg } from '@/plugins/printTradeModule';
import { addComputeBudgetIxsIfNeeded } from '@/utils/helpers';

const Key = 'FinalizeRfqConstructionOperation' as const;

/**
 * Finalizes construction of an Rfq.
 *
 * ```ts
 * const { rfq } = await convergence.rfqs.create(...);
 *
 * const { rfq } = await convergence
 *   .rfqs()
 *   .finalize({
 *     rfq: rfq.address
 *   });
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

  /** The address of the Rfq account. */
  rfq: PublicKey;

  /** Optional address of the Taker's collateral info account.
   * @defaultValue `convergence.collateral().pdas().collateralInfo({ user: rfq.taker })`
   *
   */
  collateralInfo?: PublicKey;

  /** Optional address of the Taker's collateral tokens account.
   *
   * @defaultValue `convergence.collateral().pdas().
   *   collateralTokens({
   *     user: convergence.identity().publicKey
   *   })`
   */
  collateralToken?: PublicKey;

  /** Optional address of the risk engine program. */
  riskEngine?: PublicKey;

  /** Optional legs of the rfq, should not be passed manually.
   * Is passed automatically when `createAndFinalize`
   * is called. Else the legs are extracted from the rfq account.
   */
  legs?: LegInstrument[] | PrintTradeLeg[];
};

/**
 * @group Operations
 * @category Outputs
 */
export type FinalizeRfqConstructionOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;

  rfq: Rfq;
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
      const { rfq: inputRfq } = operation.input;

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

      const rfq = await convergence
        .rfqs()
        .findRfqByAddress({ address: inputRfq });
      assertRfq(rfq);

      return { ...output, rfq };
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
): Promise<TransactionBuilder> => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;

  const riskEngineProgram = convergence.programs().getRiskEngine(programs);
  const rfqProgram = convergence.programs().getRfq(programs);

  const {
    taker = convergence.identity(),
    riskEngine = riskEngineProgram.address,
    rfq,
  } = params;
  let { legs, collateralInfo, collateralToken } = params;

  const collateralInfoPda = convergence.collateral().pdas().collateralInfo({
    user: taker.publicKey,
    programs,
  });
  const collateralTokenPda = convergence.collateral().pdas().collateralToken({
    user: taker.publicKey,
    programs,
  });

  legs =
    legs ?? (await convergence.rfqs().findRfqByAddress({ address: rfq })).legs;

  collateralInfo = collateralInfo ?? collateralInfoPda;
  collateralToken = collateralToken ?? collateralTokenPda;

  const protocol = convergence.protocol().pdas().protocol();

  const txBuilder = TransactionBuilder.make()
    .setFeePayer(payer)
    .setContext({
      rfq,
    })
    .add({
      instruction: ComputeBudgetProgram.setComputeUnitLimit({
        units: 300000,
      }),
      signers: [],
    })
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

  await addComputeBudgetIxsIfNeeded(txBuilder, convergence, true);
  return txBuilder;
};
