import { createFundCollateralInstruction } from '@convergence-rfq/rfq';
import { PublicKey } from '@solana/web3.js';

import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
  Signer,
} from '../../../types';
import {
  TransactionBuilder,
  TransactionBuilderOptions,
  addDecimals,
} from '../../../utils';
import { Convergence } from '../../../Convergence';
import { protocolCache } from '../../protocolModule/cache';
import { collateralMintCache } from '../cache';

const Key = 'FundCollateralOperation' as const;

/**
 * Funds a collateral account.
 *
 * ```ts
 * await convergence
 *   .collateral()
 *   .fundCollateral({ amount: 100.5 };
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
  /** The amount to fund. */
  amount: number;

  /**
   * The user for whom collateral is funded.
   *
   * @defaultValue `convergence.identity()`
   */
  user?: Signer;

  /**
   * User token account.
   *
   * @defaultValue `convergence
   *   .tokens()
   *   .pdas()
   *   .associatedTokenAccount({
   *     mint: <publicKey>,
   *     owner: <publicKey>
   *   })`
   */
  userTokens?: PublicKey;

  /**
   * The address of the protocol.
   *
   * @defaultValue `convergence.protocol().pdas().protocol()`
   */
  protocol?: PublicKey;
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
      const builder = await fundCollateralBuilder(
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

  const protocolModel = await protocolCache.get(convergence);

  const {
    amount,
    protocol = convergence.protocol().pdas().protocol(),
    userTokens = convergence.tokens().pdas().associatedTokenAccount({
      mint: protocolModel.collateralMint,
      owner: user.publicKey,
      programs,
    }),
  } = params;

  const collateralMint = await collateralMintCache.get(convergence);

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .add({
      instruction: createFundCollateralInstruction(
        {
          user: user.publicKey,
          userTokens,
          protocol,
          collateralInfo: convergence
            .collateral()
            .pdas()
            .collateralInfo({ user: user.publicKey }),
          collateralToken: convergence
            .collateral()
            .pdas()
            .collateralToken({ user: user.publicKey }),
        },
        {
          amount: addDecimals(amount, collateralMint.decimals),
        },
        convergence.programs().getRfq(programs).address
      ),
      signers: [user],
      key: 'fundCollateral',
    });
};
