import { PublicKey } from '@solana/web3.js';
import { createUnlockRfqCollateralInstruction } from '@convergence-rfq/rfq';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
  makeConfirmOptionsFinalizedOnMainnet,
} from '@/types';
import { Convergence } from '@/Convergence';
import { TransactionBuilder, TransactionBuilderOptions } from '@/utils';

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
  protocol?: PublicKey;
  /** The Rfq address */
  rfq: PublicKey;
  /** The address of the taker's collateralInfo account */
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
  const { rfq } = params;

  const rfqProgram = convergence.programs().getRfq(programs);
  const protocol = await convergence.protocol().get();

  const rfqModel = await convergence.rfqs().findRfqByAddress({ address: rfq });

  const [collateralInfoPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('collateral_info'), rfqModel.taker.toBuffer()],
    rfqProgram.address
  );

  return TransactionBuilder.make<UnlockRfqCollateralBuilderContext>()
    .setFeePayer(payer)
    .add({
      instruction: createUnlockRfqCollateralInstruction(
        {
          protocol: protocol.address,
          rfq,
          collateralInfo: collateralInfoPda,
        },
        rfqProgram.address
      ),
      signers: [],
      key: 'unlockRfqCollateral',
    });
};
