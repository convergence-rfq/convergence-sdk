import { createFundCollateralInstruction } from '@convergence-rfq/rfq';
import { PublicKey } from '@solana/web3.js';

import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
  Signer,
  makeConfirmOptionsFinalizedOnMainnet,
} from '../../../types';
import { TransactionBuilder, TransactionBuilderOptions } from '../../../utils';
import { Convergence } from '../../../Convergence';
import { collateralMintCache } from '../cache';

const Key = 'FundCollateralOperation' as const;

/**
 * Funds a collateral account.
 *
 * ```ts
 * const rfq = await convergence
 *   .collateral()
 *   .fundCollateral({ amount: 100 };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const fundCollateralOperation =
  useOperation<FundCollateralOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type FundCollateralOperation = Operation<
  typeof Key,
  FundCollateralInput,
  FundCollateralOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type FundCollateralInput = {
  /**
   * The user for whom collateral is funded.
   *
   * @defaultValue `convergence.identity()`
   */
  user?: Signer;

  /**
   * The address of the protocol.
   *
   * @defaultValue `(await convergence.protocol().get()).address`
   */
  protocol?: PublicKey;

  /** Token account of user's token */
  userTokens?: PublicKey;

  /** Optional address of the User's collateral info account.
   * @defaultValue `convergence.collateral().pdas().collateralInfo({ user: user.publicKey })`
   *
   */
  collateralInfo?: PublicKey;

  /** Optional address of the User's collateral tokens account.
   *
   * @defaultValue `convergence.collateral().pdas().
   *   collateralTokens({
   *     user: user.publicKey,
   *   })`
   */
  collateralToken?: PublicKey;

  /*
   * Args
   */

  /** The amount to fund. */
  amount: number;
};

/**
 * @group Operations
 * @category Outputs
 */
export type FundCollateralOutput = {
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const fundCollateralOperationHandler: OperationHandler<FundCollateralOperation> =
  {
    handle: async (
      operation: FundCollateralOperation,
      convergence: Convergence,
      scope: OperationScope
    ) => {
      scope.throwIfCanceled();

      const builder = await fundCollateralBuilder(
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

export type FundCollateralBuilderParams = FundCollateralInput;

/**
 * Funds a collateral account.
 *
 * ```ts
 * const transactionBuilder = await convergence
 *   .rfqs()
 *   .builders()
 *   .fundCollateral();
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const fundCollateralBuilder = async (
  convergence: Convergence,
  params: FundCollateralBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<TransactionBuilder> => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const { user = convergence.identity() } = params;

  const collateralMint = await collateralMintCache.get(convergence);

  const {
    protocol = convergence.protocol().pdas().protocol(),
    collateralToken = convergence
      .collateral()
      .pdas()
      .collateralToken({ user: user.publicKey }),
    collateralInfo = convergence
      .collateral()
      .pdas()
      .collateralInfo({ user: user.publicKey }),
    userTokens = convergence.tokens().pdas().associatedTokenAccount({
      mint: collateralMint.address,
      owner: user.publicKey,
      programs,
    }),
  } = params;
  let { amount } = params;

  amount *= Math.pow(10, collateralMint.decimals);

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .add({
      instruction: createFundCollateralInstruction(
        {
          user: user.publicKey,
          userTokens,
          protocol,
          collateralInfo,
          collateralToken,
        },
        {
          amount,
        },
        convergence.programs().getRfq(programs).address
      ),
      signers: [user],
      key: 'fundCollateral',
    });
};
