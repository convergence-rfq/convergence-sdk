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

  /** Token account of user's token */
  userTokens: PublicKey;

  /** The address of the protocol account. */
  protocol?: PublicKey;

  /** The address of the user's collateral_info account. */
  collateralInfo?: PublicKey;

  /** The Token account of the user's collateral */
  collateralToken?: PublicKey;

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

  const [protocolPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('protocol')],
    rfqProgram.address
  );

  const {
    user = convergence.identity(),
    protocol = protocolPda,
    userTokens,
    amount,
  } = params;
  let { collateralInfo, collateralToken } = params;

  const [collateralTokenPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('collateral_token'), user.publicKey.toBuffer()],
    rfqProgram.address
  );
  const [collateralInfoPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('collateral_info'), user.publicKey.toBuffer()],
    rfqProgram.address
  );

  collateralInfo = collateralInfo ?? collateralInfoPda;
  collateralToken = collateralToken ?? collateralTokenPda;

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
          amount,
        },
        rfqProgram.address
      ),
      signers: [user],
      key: 'fundCollateral',
    });
};
