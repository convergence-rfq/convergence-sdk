import {
  PublicKey,
  // SystemProgram
} from '@solana/web3.js';
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
import { bignum } from '@metaplex-foundation/beet';

const Key = 'FundCollateralOperation' as const;

/**
 * Finds Rfq by a given address.
 *
 * ```ts
 * const rfq = await convergence
 *   .rfqs()
 *   .findByAddress({ address };
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
   * The user for whom collateral is initialized.
   *
   * @defaultValue `convergence.identity().publicKey`
   */
  user?: Signer;

  userTokens: PublicKey;

  protocol: PublicKey;

  collateralInfo: PublicKey;

  collateralToken: PublicKey;

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
    ): Promise<FundCollateralOutput> => {
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
 *   .create();
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
  const rfqProgram = convergence.programs().getRfq(programs);
  const tokenProgram = convergence.programs().getToken(programs);

  const {
    user = convergence.identity(),
    userTokens,
    protocol,
    collateralInfo,
    collateralToken,
    amount,
  } = params;

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
          tokenProgram: tokenProgram.address,
        },
        {
          amount,
        },
        rfqProgram.address
      ),
      signers: [user],
      key: 'fundCollateral',
    });
};
