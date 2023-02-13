import { PublicKey } from '@solana/web3.js';
import { createWithdrawCollateralInstruction } from '@convergence-rfq/rfq';
import { bignum } from '@convergence-rfq/beet';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
  Signer,
  makeConfirmOptionsFinalizedOnMainnet,
} from '@/types';
import { Convergence } from '@/Convergence';
import { TransactionBuilder, TransactionBuilderOptions } from '@/utils';

const Key = 'WithdrawCollateralOperation' as const;

/**
 * withdraws a collateral account.
 *
 * ```ts
 * const rfq = await convergence
 *   .rfqs()
 *   .withdrawCollateral({ address };
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

  /** The address of the user's token account where withdrawn
   * tokens will be transferred to. */
  userTokens?: PublicKey;

  protocol?: PublicKey;

  collateralInfo?: PublicKey;

  collateralToken?: PublicKey;

  /*
   * Args
   */

  /** The amount to withdraw */
  amount: bignum;
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
      scope.throwIfCanceled();

      const builder = await withdrawCollateralBuilder(
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
  const rfqProgram = convergence.programs().getRfq(programs);

  const protocolModel = await convergence.protocol().get();

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

  return TransactionBuilder.make<WithdrawCollateralBuilderContext>()
    .setFeePayer(user)
    .add({
      instruction: createWithdrawCollateralInstruction(
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
        rfqProgram.address
      ),
      signers: [user],
      key: 'withdrawCollateral',
    });
};
