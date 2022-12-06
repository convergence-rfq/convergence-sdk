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
import { createInitializeCollateralInstruction } from '@convergence-rfq/rfq';

const Key = 'InitializeCollateralOperation' as const;

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
export const initializeCollateralOperation =
  useOperation<InitializeCollateralOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type InitializeCollateralOperation = Operation<
  typeof Key,
  InitializeCollateralInput,
  InitializeCollateralOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type InitializeCollateralInput = {
  /**
   * The user for whom collateral is initialized.
   *
   * @defaultValue `convergence.identity().publicKey`
   */
  user?: Signer;

  protocol: PublicKey;

  collateralInfo: PublicKey;

  collateralToken: PublicKey;

  collateralMint: PublicKey;
};

/**
 * @group Operations
 * @category Outputs
 */
export type InitializeCollateralOutput = {
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const initializeCollateralOperationHandler: OperationHandler<InitializeCollateralOperation> =
  {
    handle: async (
      operation: InitializeCollateralOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<InitializeCollateralOutput> => {
      const builder = await initializeCollateralBuilder(
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

export type InitializeCollateralBuilderParams = InitializeCollateralInput;

/**
 * @group Transaction Builders
 * @category Contexts
 */
export type InitializeCollateralBuilderContext =
  SendAndConfirmTransactionResponse;

/**
 * Initializes a collateral account.
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
export const initializeCollateralBuilder = async (
  convergence: Convergence,
  params: InitializeCollateralBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<TransactionBuilder<InitializeCollateralBuilderContext>> => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const rfqProgram = convergence.programs().getRfq(programs);
  const tokenProgram = convergence.programs().getToken(programs);
  const systemProgram = convergence.programs().getSystem(programs);

  const {
    user = convergence.identity(),
    protocol,
    collateralInfo,
    collateralToken,
    collateralMint,
  } = params;

  return TransactionBuilder.make<InitializeCollateralBuilderContext>()
    .setFeePayer(payer)
    .add({
      instruction: createInitializeCollateralInstruction(
        {
          user: user.publicKey,
          protocol,
          collateralInfo,
          collateralToken,
          collateralMint,
          systemProgram: systemProgram.address,
          tokenProgram: tokenProgram.address,
        },
        rfqProgram.address
      ),
      signers: [user],
      key: 'initializeCollateral',
    });
};
