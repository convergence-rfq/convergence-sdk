import { PublicKey } from '@solana/web3.js';
import { createUnlockResponseCollateralInstruction } from '@convergence-rfq/rfq';
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

const Key = 'UnlockResponseCollateralOperation' as const;

/**
 * Unlocks collateral for a Response
 *
 * ```ts
 * const rfq = await convergence
 *   .rfqs()
 *   .unlockResponseCollateral({ address };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const unlockResponseCollateralOperation =
  useOperation<UnlockResponseCollateralOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type UnlockResponseCollateralOperation = Operation<
  typeof Key,
  UnlockResponseCollateralInput,
  UnlockResponseCollateralOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type UnlockResponseCollateralInput = {
  /** The protocol address */
  protocol?: PublicKey;
  /** The Rfq address */
  rfq: PublicKey;
  /** The response address */
  response: PublicKey;
  /** The address of the Taker's collateralInfo account */
  takerCollateralInfo?: PublicKey;
  /** The address of the Maker's collateralInfo account */
  makerCollateralInfo?: PublicKey;
};

/**
 * @group Operations
 * @category Outputs
 */
export type UnlockResponseCollateralOutput = {
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const unlockResponseCollateralOperationHandler: OperationHandler<UnlockResponseCollateralOperation> =
  {
    handle: async (
      operation: UnlockResponseCollateralOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<UnlockResponseCollateralOutput> => {
      const builder = await unlockResponseCollateralBuilder(
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

export type UnlockResponseCollateralBuilderParams =
  UnlockResponseCollateralInput;

/**
 * UnlockRfqs a collateral account.
 *
 * ```ts
 * const transactionBuilder = await convergence
 *   .rfqs()
 *   .builders()
 *   .unlockResponseCollateral();
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const unlockResponseCollateralBuilder = async (
  convergence: Convergence,
  params: UnlockResponseCollateralBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<TransactionBuilder> => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const rfqProgram = convergence.programs().getRfq(programs);
  const protocol = await convergence.protocol().get();

  const { rfq, response } = params;

  const rfqModel = await convergence.rfqs().findRfqByAddress({ address: rfq });
  const responseModel = await convergence
    .rfqs()
    .findResponseByAddress({ address: response });

  const [takerCollateralInfoPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('collateral_info'), rfqModel.taker.toBuffer()],
    rfqProgram.address
  );
  const [makerCollateralInfoPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('collateral_info'), responseModel.maker.toBuffer()],
    rfqProgram.address
  );

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .add({
      instruction: createUnlockResponseCollateralInstruction(
        {
          protocol: protocol.address,
          rfq,
          response,
          takerCollateralInfo: takerCollateralInfoPda,
          makerCollateralInfo: makerCollateralInfoPda,
        },
        rfqProgram.address
      ),
      signers: [],
      key: 'unlockResponseCollateral',
    });
};
