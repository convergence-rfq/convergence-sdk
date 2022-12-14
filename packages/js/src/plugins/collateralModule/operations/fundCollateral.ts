import { PublicKey } from '@solana/web3.js';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '@/types';
import { Convergence } from '@/Convergence';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { TransactionBuilder, TransactionBuilderOptions } from '@/utils';
import { Signer, makeConfirmOptionsFinalizedOnMainnet } from '@/types';
import { createFundCollateralInstruction } from '@convergence-rfq/rfq';

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
   * @defaultValue `convergence.identity().publicKey`
   */
  user: Signer;
  /** Token account of user's token */
  userTokens: PublicKey;
  /** The address of the protocol account. */
  protocol: PublicKey;
  /** The address of the user's collateral_info account. */
  collateralInfo: PublicKey;
  /** The Token account of the user's collateral */
  collateralToken: PublicKey;

  /*
   * Args
   */

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
  const { programs } = options;
  const rfqProgram = convergence.programs().getRfq(programs);

  const {
    user = convergence.identity(),
    userTokens,
    protocol,
    collateralInfo,
    collateralToken,
    amount,
  } = params;

  return TransactionBuilder.make()
    .setFeePayer(user)
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
          amount: amount,
        },
        rfqProgram.address
      ),
      signers: [user],
      key: 'fundCollateral',
    });
};
