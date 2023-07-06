import { PublicKey } from '@solana/web3.js';
import { createWithdrawCollateralInstruction } from '@convergence-rfq/rfq';

import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
  Signer,
} from '../../../types';
import { Convergence } from '../../../Convergence';
import {
  TransactionBuilder,
  TransactionBuilderOptions,
  addDecimals,
} from '../../../utils';
import { protocolCache } from '../../protocolModule/cache';
import { collateralMintCache } from '../cache';

const Key = 'WithdrawCollateralOperation' as const;

/**
 * withdraws a collateral account.
 *
 * ```ts
 * const rfq = await convergence
 *   .collateral()
 *   .withdrawCollateral({ amount: 100 };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const withdrawCollateralOperation =
  useOperation<WithdrawCollateralOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type WithdrawCollateralOperation = Operation<
  typeof Key,
  WithdrawCollateralInput,
  WithdrawCollateralOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type WithdrawCollateralInput = {
  /**
   * The user for whom collateral is withdrawn.
   *
   * @defaultValue `convergence.identity().publicKey`
   */
  user?: Signer;

  /** The address of the user's token account where withdrawn tokens will be transferred to. */
  userTokens?: PublicKey;

  /**
   * The address of the protocol.
   *
   * @defaultValue `convergence.protocol().pdas().protcol()`
   */
  protocol?: PublicKey;

  /** The address of the user's collateral info account. */
  collateralInfo?: PublicKey;

  /** The address of the user's collateral token account. */
  collateralToken?: PublicKey;

  /** The amount to withdraw */
  amount: number;
};

/**
 * @group Operations
 * @category Outputs
 */
export type WithdrawCollateralOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const withdrawCollateralOperationHandler: OperationHandler<WithdrawCollateralOperation> =
  {
    handle: async (
      operation: WithdrawCollateralOperation,
      convergence: Convergence,
      scope: OperationScope
    ) => {
      const builder = await withdrawCollateralBuilder(
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

export type WithdrawCollateralBuilderParams = WithdrawCollateralInput;

/**
 * @group Transaction Builders
 * @category Contexts
 */
export type WithdrawCollateralBuilderContext = Omit<
  WithdrawCollateralOutput,
  'collateral'
>;

/**
 * withdraws a collateral account.
 *
 * ```ts
 * const transactionBuilder = await convergence
 *   .rfqs()
 *   .builders()
 *   .withdrawCollateral();
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const withdrawCollateralBuilder = async (
  convergence: Convergence,
  params: WithdrawCollateralBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<TransactionBuilder<WithdrawCollateralBuilderContext>> => {
  const { programs } = options;

  const protocolModel = await protocolCache.get(convergence);

  const {
    user = convergence.identity(),
    protocol = convergence.protocol().pdas().protocol(),
    collateralInfo = convergence
      .collateral()
      .pdas()
      .collateralInfo({ user: user.publicKey }),
    collateralToken = convergence
      .collateral()
      .pdas()
      .collateralToken({ user: user.publicKey }),
    userTokens = convergence.tokens().pdas().associatedTokenAccount({
      mint: protocolModel.collateralMint,
      owner: user.publicKey,
      programs,
    }),
    amount,
  } = params;

  const collateralMint = await collateralMintCache.get(convergence);

  return TransactionBuilder.make<WithdrawCollateralBuilderContext>()
    .setFeePayer(user)
    .add({
      instruction: createWithdrawCollateralInstruction(
        {
          userTokens,
          protocol,
          collateralInfo,
          collateralToken,
          user: user.publicKey,
        },
        {
          amount: addDecimals(amount, collateralMint.decimals),
        },
        convergence.programs().getRfq(programs).address
      ),
      signers: [user],
      key: 'withdrawCollateral',
    });
};
