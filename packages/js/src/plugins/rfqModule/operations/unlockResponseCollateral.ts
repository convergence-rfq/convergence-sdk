import { PublicKey, Transaction } from '@solana/web3.js';
import { createUnlockResponseCollateralInstruction } from '@convergence-rfq/rfq';

import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '../../../types';
import { Convergence } from '../../../Convergence';
import { TransactionBuilder, TransactionBuilderOptions } from '../../../utils';
import { protocolCache } from '../../protocolModule/cache';
import { Response } from '../models/Response';

const Key = 'unlockResponseCollateralOperation' as const;

/**
 * Unlocks collateral for a Response
 *
 * ```ts
 * const rfq = await convergence
 *   .rfqs()
 *   .unlockResponseCollateral({
 *     responses,
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
   * The response addresses.
   */
  responses: PublicKey[] | Response[];

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
export type UnlockResponseCollateralOutput = {};

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
    ) => {
      const builder = await unlockResponseCollateralBuilder(
        convergence,
        {
          ...operation.input,
        },
        scope
      );

      const signedTnxs = await convergence
        .identity()
        .signAllTransactions(builder);
      for (const tx of signedTnxs) {
        await convergence
          .rpc()
          .serializeAndSendTransaction(tx, scope.confirmOptions);
      }

      scope.throwIfCanceled();
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
): Promise<Transaction[]> => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const { responses } = params;

  const protocol = await protocolCache.get(convergence);
  const txArray: Transaction[] = [];
  for (let response of responses) {
    if (response instanceof PublicKey) {
      response = await convergence
        .rfqs()
        .findResponseByAddress({ address: response });
    }
    const { taker } = await convergence
      .rfqs()
      .findRfqByAddress({ address: response.rfq });

    const txBuilder = TransactionBuilder.make()
      .setFeePayer(payer)
      .add({
        instruction: createUnlockResponseCollateralInstruction(
          {
            rfq: response.rfq,
            response: response.address,
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
                user: response.maker,
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
                user: response.maker,
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
        key: 'unlockMultipleResponseCollateral',
      });
    const blockHashWithBlockHeight = await convergence
      .rpc()
      .getLatestBlockhash();
    const tx = txBuilder.toTransaction(blockHashWithBlockHeight);
    txArray.push(tx);
  }

  return txArray;
};
