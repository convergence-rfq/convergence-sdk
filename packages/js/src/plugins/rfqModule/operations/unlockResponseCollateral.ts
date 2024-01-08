import { ComputeBudgetProgram, PublicKey } from '@solana/web3.js';
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
import { protocolCache } from '../../protocolModule/cache';
import { SendAndConfirmTransactionResponse } from '@/plugins';
import { TRANSACTION_PRIORITY_FEE_MAP } from '@/constants';

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

  /**
   * The protocol address.
   *
   * @defaultValue `convergence.protocol().pdas().protocol()`
   */
  protocol?: PublicKey;
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

  const protocol = await protocolCache.get(convergence);

  const responseModel = await convergence
    .rfqs()
    .findResponseByAddress({ address: response });

  const { taker } = await convergence
    .rfqs()
    .findRfqByAddress({ address: responseModel.rfq });

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .add(
      {
        instruction: ComputeBudgetProgram.setComputeUnitPrice({
          microLamports:
            TRANSACTION_PRIORITY_FEE_MAP[convergence.transactionPriority] ??
            TRANSACTION_PRIORITY_FEE_MAP['none'],
        }),
        signers: [],
      },
      {
        instruction: createUnlockResponseCollateralInstruction(
          {
            rfq: responseModel.rfq,
            response: responseModel.address,
            protocol: convergence.protocol().pdas().protocol(),
            takerCollateralInfo: convergence
              .collateral()
              .pdas()
              .collateralInfo({
                user: taker,
                programs,
              }),
            makerCollateralInfo: convergence
              .collateral()
              .pdas()
              .collateralInfo({
                user: responseModel.maker,
                programs,
              }),
            takerCollateralTokens: convergence
              .collateral()
              .pdas()
              .collateralToken({
                user: taker,
                programs,
              }),
            makerCollateralTokens: convergence
              .collateral()
              .pdas()
              .collateralToken({
                user: responseModel.maker,
                programs,
              }),
            protocolCollateralTokens: convergence
              .collateral()
              .pdas()
              .collateralToken({
                user: protocol.authority,
                programs,
              }),
          },
          convergence.programs().getRfq(programs).address
        ),
        signers: [],
        key: 'unlockeResponseCollateral',
      }
    );
};
