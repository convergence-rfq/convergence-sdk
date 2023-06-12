import { PublicKey, Transaction } from '@solana/web3.js';
import { createUnlockResponseCollateralInstruction } from '@convergence-rfq/rfq';

import {
  Operation,
  OperationHandler,
  OperationScope,
  makeConfirmOptionsFinalizedOnMainnet,
  useOperation,
} from '../../../types';
import { Convergence } from '../../../Convergence';
import { TransactionBuilder, TransactionBuilderOptions } from '../../../utils';
import { protocolCache } from '../../protocolModule/cache';

const Key = 'unlockMultipleResponseCollateralOperation' as const;

/**
 * Unlocks collateral for a Response
 *
 * ```ts
 * const rfq = await convergence
 *   .rfqs()
 *   .unlockMultipleResponseCollateral({
 *     response: rfqResponse.address
 *   });
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const unlockMultipleResponseCollateralOperation =
  useOperation<UnlockMultipleResponseCollateralOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type UnlockMultipleResponseCollateralOperation = Operation<
  typeof Key,
  UnlockMultipleResponseCollateralInput,
  UnlockMultipleResponseCollateralOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type UnlockMultipleResponseCollateralInput = {
  /**
   * The protocol address.
   *
   * @defaultValue `convergence.protocol().pdas().protocol()`
   */
  protocol?: PublicKey;

  /** The Response address. */
  responses: PublicKey[];
};

/**
 * @group Operations
 * @category Outputs
 */
export type UnlockMultipleResponseCollateralOutput = {};

/**
 * @group Operations
 * @category Handlers
 */
export const unlockMultipleResponseCollateralOperationHandler: OperationHandler<UnlockMultipleResponseCollateralOperation> =
  {
    handle: async (
      operation: UnlockMultipleResponseCollateralOperation,
      convergence: Convergence,
      scope: OperationScope
    ) => {
      const txArray = await unlockMultipleResponseCollateralBuilder(
        convergence,
        {
          ...operation.input,
        },
        scope
      );
      scope.throwIfCanceled();
      // const signedTnxs = await convergence
      //   .rpc()
      //   .signAllTransactions(txArray, [convergence.rpc().getDefaultFeePayer()]);
      const signedTnxs = await convergence
        .identity()
        .signAllTransactions(txArray);
      const confirmOptions = makeConfirmOptionsFinalizedOnMainnet(
        convergence,
        scope.confirmOptions
      );
      for (const tx of signedTnxs) {
        await convergence.rpc().serializeAndSendTransaction(tx, confirmOptions);
      }
      scope.throwIfCanceled();
    },
  };

export type UnlockMultipleResponseCollateralBuilderParams =
  UnlockMultipleResponseCollateralInput;

/**
 * UnlockRfqs a collateral account.
 *
 * ```ts
 * const transactionBuilder = await convergence
 *   .rfqs()
 *   .builders()
 *   .unlockMultipleResponseCollateral();
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const unlockMultipleResponseCollateralBuilder = async (
  convergence: Convergence,
  params: UnlockMultipleResponseCollateralBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<Transaction[]> => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const rfqProgram = convergence.programs().getRfq(programs);
  const protocol = await protocolCache.get(convergence);
  const txArray: Transaction[] = [];
  const { responses } = params;
  for (const response of responses) {
    const { maker, rfq } = await convergence
      .rfqs()
      .findResponseByAddress({ address: response });
    const { taker } = await convergence
      .rfqs()
      .findRfqByAddress({ address: rfq });

    const takerCollateralInfoPda = convergence
      .collateral()
      .pdas()
      .collateralInfo({
        user: taker,
        programs,
      });
    const makerCollateralInfoPda = convergence
      .collateral()
      .pdas()
      .collateralInfo({
        user: maker,
        programs,
      });
    const takerCollateralTokensPda = convergence
      .collateral()
      .pdas()
      .collateralToken({
        user: taker,
        programs,
      });
    const makerCollateralTokensPda = convergence
      .collateral()
      .pdas()
      .collateralToken({
        user: maker,
        programs,
      });
    const protocolCollateralTokensPda = convergence
      .collateral()
      .pdas()
      .collateralToken({
        user: protocol.authority,
        programs,
      });
    const txBuilder = TransactionBuilder.make()
      .setFeePayer(payer)
      .add({
        instruction: createUnlockResponseCollateralInstruction(
          {
            protocol: protocol.address,
            rfq,
            response,
            takerCollateralInfo: takerCollateralInfoPda,
            makerCollateralInfo: makerCollateralInfoPda,
            takerCollateralTokens: takerCollateralTokensPda,
            makerCollateralTokens: makerCollateralTokensPda,
            protocolCollateralTokens: protocolCollateralTokensPda,
          },
          rfqProgram.address
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
