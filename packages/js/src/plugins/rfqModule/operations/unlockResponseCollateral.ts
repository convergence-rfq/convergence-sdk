import { PublicKey } from '@solana/web3.js';
import { createUnlockResponseCollateralInstruction } from '@convergence-rfq/rfq';

import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
  makeConfirmOptionsFinalizedOnMainnet,
} from '../../../types';
import { Convergence } from '../../../Convergence';
import { TransactionBuilder, TransactionBuilderOptions } from '../../../utils';
import { protocolCache } from '../../protocolModule/cache';

const Key = 'UnlockResponseCollateralOperation' as const;

/**
 * Unlocks collateral for a Response
 *
 * ```ts
 * const rfq = await convergence
 *   .rfqs()
 *   .unlockResponseCollateral({
 *     response: rfqResponse.address
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
   * The protocol address.
   *
   * @defaultValue `convergence.protocol().pdas().protocol()`
   */
  protocol?: PublicKey;

  /** The Response address. */
  response: PublicKey;

  /**
   * Optional address of the Taker's collateral info account.
   *
   * @defaultValue `convergence.collateral().pdas().collateralInfo({ user: rfq.taker })`
   *
   */
  takerCollateralInfo?: PublicKey;

  /**
   * Optional address of the Maker's collateral info account.
   *
   * @defaultValue `convergence.collateral().pdas().collateralInfo({ user: response.maker })`
   *
   */
  makerCollateralInfo?: PublicKey;

  /**
   * Optional address of the Taker's collateral tokens account.
   *
   * @defaultValue `convergence.collateral().pdas().
   *   collateralTokens({
   *     user: rfq.taker,
   *   })`
   */
  takerCollateralTokens?: PublicKey;

  /**
   * Optional address of the Maker's collateral tokens account.
   *
   * @defaultValue `convergence.collateral().pdas().
   *   collateralTokens({
   *     user: response.maker,
   *   })`
   */
  makerCollateralTokens?: PublicKey;

  /**
   * Optional address of the DAO's collateral tokens account.
   *
   * @defaultValue `convergence.collateral().pdas().
   *   collateralTokens({
   *     user: dao
   *   })`
   */
  protocolCollateralTokens?: PublicKey;
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
  const protocol = await protocolCache.get(convergence);

  const { response } = params;
  let {
    takerCollateralInfo,
    makerCollateralInfo,
    takerCollateralTokens,
    makerCollateralTokens,
    protocolCollateralTokens,
  } = params;

  const { maker, rfq } = await convergence
    .rfqs()
    .findResponseByAddress({ address: response });
  const { taker } = await convergence.rfqs().findRfqByAddress({ address: rfq });

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

  takerCollateralInfo = takerCollateralInfo ?? takerCollateralInfoPda;
  makerCollateralInfo = makerCollateralInfo ?? makerCollateralInfoPda;
  takerCollateralTokens = takerCollateralTokens ?? takerCollateralTokensPda;
  makerCollateralTokens = makerCollateralTokens ?? makerCollateralTokensPda;
  protocolCollateralTokens =
    protocolCollateralTokens ?? protocolCollateralTokensPda;

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .add({
      instruction: createUnlockResponseCollateralInstruction(
        {
          protocol: protocol.address,
          rfq,
          response,
          takerCollateralInfo,
          makerCollateralInfo,
          takerCollateralTokens,
          makerCollateralTokens,
          protocolCollateralTokens,
        },
        rfqProgram.address
      ),
      signers: [],
      key: 'unlockResponseCollateral',
    });
};
