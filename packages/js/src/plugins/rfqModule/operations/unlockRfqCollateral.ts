import { PublicKey } from '@solana/web3.js';
import { createUnlockRfqCollateralInstruction } from '@convergence-rfq/rfq';

import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '../../../types';
import { Convergence } from '../../../Convergence';
import {
  TransactionBuilder,
  TransactionBuilderOptions,
} from '../../../utils/TransactionBuilder';

const Key = 'UnlockRfqCollateralOperation' as const;

/**
 * Unlocks collateral for an Rfq
 *
 * ```ts
 * const rfq = await convergence
 *   .rfqs()
 *   .unlockRfqCollateral({ rfq: rfq.address });
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const unlockRfqCollateralOperation =
  useOperation<UnlockRfqCollateralOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type UnlockRfqCollateralOperation = Operation<
  typeof Key,
  UnlockRfqCollateralInput,
  UnlockRfqCollateralOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type UnlockRfqCollateralInput = {
  /**
   * The protocol address.
   *
   * @defaultValue `convergence.protocol().pdas().protocol()`
   */
  protocol?: PublicKey;

  /** The address of the Rfq account. */
  rfq: PublicKey;

  /**
   * Optional address of the Taker's collateral info account.
   *
   * @defaultValue `convergence.collateral().pdas().collateralInfo({ user: rfq.taker })`
   *
   */
  collateralInfo?: PublicKey;
};

/**
 * @group Operations
 * @category Outputs
 */
export type UnlockRfqCollateralOutput = {
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const unlockRfqCollateralOperationHandler: OperationHandler<UnlockRfqCollateralOperation> =
  {
    handle: async (
      operation: UnlockRfqCollateralOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<UnlockRfqCollateralOutput> => {
      const builder = await unlockRfqCollateralBuilder(
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

export type UnlockRfqCollateralBuilderParams = UnlockRfqCollateralInput;

/**
 * @group Transaction Builders
 * @category Contexts
 */
export type UnlockRfqCollateralBuilderContext =
  SendAndConfirmTransactionResponse;

/**
 * UnlockRfqs a collateral account.
 *
 * ```ts
 * const transactionBuilder = await convergence
 *   .rfqs()
 *   .builders()
 *   .unlockRfqCollateral();
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const unlockRfqCollateralBuilder = async (
  convergence: Convergence,
  params: UnlockRfqCollateralBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<TransactionBuilder> => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const { rfq } = params;

  let { collateralInfo } = params;

  const rfqProgram = convergence.programs().getRfq(programs);

  const rfqModel = await convergence.rfqs().findRfqByAddress({ address: rfq });

  const collateralInfoPda = convergence.collateral().pdas().collateralInfo({
    user: rfqModel.taker,
    programs,
  });

  collateralInfo = collateralInfo ?? collateralInfoPda;

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .addTxPriorityFeeIx(convergence)
    .add({
      instruction: createUnlockRfqCollateralInstruction(
        {
          protocol: convergence.protocol().pdas().protocol(),
          rfq,
          collateralInfo,
        },
        rfqProgram.address
      ),
      signers: [],
      key: 'unlockRfqCollateral',
    });
};
