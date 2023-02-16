import { createFundCollateralInstruction } from '@convergence-rfq/rfq';
import { PublicKey } from '@solana/web3.js';
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
import { TransactionBuilder, TransactionBuilderOptions } from '@/utils';
import { Convergence } from '@/Convergence';

const Key = 'FundCollateralOperation' as const;

/**
 * Funds a collateral account.
 *
 * ```ts
 * const rfq = await convergence
 *   .rfqs()
 *   .fundCollateral({ address };
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

  protocol?: PublicKey;

  /** Token account of user's token */
  userTokens?: PublicKey;

  /** The address of the user's collateral info account. */
  collateralInfo?: PublicKey;

  /** The Token account of the user's collateral */
  collateralToken?: PublicKey;

  /*
   * Args
   */

  amount: bignum;
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

  const protocolModel = await convergence.protocol().get();

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
      mint: protocolModel.collateralMint,
      owner: user.publicKey,
      programs,
    }),
  } = params;

  let { amount } = params;

  const collateralDecimals = (
    await convergence
      .tokens()
      .findMintByAddress({ address: protocolModel.collateralMint })
  ).decimals;

  amount = ((amount as number) *= 10 ** collateralDecimals);

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
