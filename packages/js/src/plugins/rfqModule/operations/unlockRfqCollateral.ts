import { PublicKey } from '@solana/web3.js';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '@/types';
import { Convergence } from '@/Convergence';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { TransactionBuilder, TransactionBuilderOptions } from '@/utils';
import { makeConfirmOptionsFinalizedOnMainnet } from '@/types';
import { createUnlockRfqCollateralInstruction } from '@convergence-rfq/rfq';

const Key = 'UnlockRfqCollateralOperation' as const;

/**
 * Unlocks collateral for an Rfq
 *
 * ```ts
 * const rfq = await convergence
 *   .rfqs()
 *   .unlockRfqCollateral({ address };
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
  /** The protocol address */
  protocol: PublicKey;
  /** The Rfq address */
  rfq: PublicKey;
  /** The address of the collateralInfo account */
  collateralInfo: PublicKey;
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
      scope.throwIfCanceled();

      const confirmOptions = makeConfirmOptionsFinalizedOnMainnet(
        convergence,
        scope.confirmOptions
      );

      const output = await builder.sendAndConfirm(convergence, confirmOptions);
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
): Promise<TransactionBuilder<UnlockRfqCollateralBuilderContext>> => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const rfqProgram = convergence.programs().getRfq(programs);

  const { protocol, rfq, collateralInfo } = params;

  return TransactionBuilder.make<UnlockRfqCollateralBuilderContext>()
    .setFeePayer(payer)
    .add({
      instruction: createUnlockRfqCollateralInstruction(
        {
          protocol,
          rfq,
          collateralInfo,
        },
        rfqProgram.address
      ),
      signers: [payer],
      key: 'unlockRfqCollateral',
    });
};
