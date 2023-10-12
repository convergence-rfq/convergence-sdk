import { PublicKey } from '@solana/web3.js';
import { createUnlockResponseCollateralInstruction } from '@convergence-rfq/rfq';

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
import { SendAndConfirmTransactionResponse } from '@/plugins';

const Key = 'unlockResponseCollateralOperation' as const;

/**
 * Unlocks collateral for a Response
 *
 * ```ts
 * await convergence
 *   .rfqs()
 *   .unlockResponseCollateral({
 *     response: <publicKey>,
 *   });
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
  /**
   * The response address.
   */
  response: PublicKey;
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

      const output = await builder.sendAndConfirm(
        convergence,
        scope.confirmOptions
      );
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
  const { response } = params;

  const responseModel = await convergence
    .rfqs()
    .findResponseByAddress({ address: response });
  const rfqModel = await convergence
    .rfqs()
    .findRfqByAddress({ address: responseModel.rfq });

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .add({
      instruction: createUnlockResponseCollateralInstruction(
        {
          taker: rfqModel.taker,
          rfq: responseModel.rfq,
          response: responseModel.address,
          takerLegTokens: convergence.tokens().pdas().associatedTokenAccount({
            mint: rfqModel.legAsset,
            owner: rfqModel.taker,
            programs,
          }),
          legEscrow: convergence.rfqs().pdas().legEscrow(responseModel.address),
          takerQuoteTokens: convergence.tokens().pdas().associatedTokenAccount({
            mint: rfqModel.quoteAsset,
            owner: rfqModel.taker,
            programs,
          }),
          quoteEscrow: convergence
            .rfqs()
            .pdas()
            .quoteEscrow(responseModel.address),
        },
        convergence.programs().getRfq(programs).address
      ),
      signers: [],
      key: 'unlockeResponseCollateral',
    });
};
