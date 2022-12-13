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
import { makeConfirmOptionsFinalizedOnMainnet } from '@/types';
import { createInitializeCollateralInstruction } from '@convergence-rfq/rfq';
import { assertCollateral, Collateral, toCollateral } from '../models';
import { toCollateralInfoAccount } from '../accounts';

const Key = 'InitializeCollateralOperation' as const;

/**
 * Initializes a collateral account.
 *
 * ```ts
 * const rfq = await convergence
 *   .rfqs()
 *   .initializeCollateral({ address };
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
  user?: PublicKey;
  /** The address of the protocol*/
  protocol: PublicKey;

  collateralMint: PublicKey;
};

/**
 * @group Operations
 * @category Outputs
 */
export type InitializeCollateralOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
  /** The newly created Collateral account */
  collateral: Collateral;
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
    ) => {
      const { commitment } = scope;
      const { user = convergence.identity().publicKey } = operation.input;
      scope.throwIfCanceled();

      const builder = await initializeCollateralBuilder(
        convergence,
        {
          ...operation.input,
          user,
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

      const rfqProgram = convergence.programs().getRfq();

      const [collateralInfoPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('collateral_info'), user.toBuffer()],
        rfqProgram.address
      );

      const account = await convergence
        .rpc()
        .getAccount(collateralInfoPda, commitment);
      scope.throwIfCanceled();

      const collateral = toCollateral(toCollateralInfoAccount(account));
      assertCollateral(collateral);

      return { ...output, collateral };
    },
  };

export type InitializeCollateralBuilderParams = InitializeCollateralInput;

/**
 * Initializes a collateral account.
 *
 * ```ts
 * const transactionBuilder = await convergence
 *   .rfqs()
 *   .builders()
 *   .initializeCollateral();
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const initializeCollateralBuilder = async (
  convergence: Convergence,
  params: InitializeCollateralBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<TransactionBuilder> => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const rfqProgram = convergence.programs().getRfq(programs);
  const tokenProgram = convergence.programs().getToken(programs);
  const systemProgram = convergence.programs().getSystem(programs);

  const {
    // user = convergence.identity().publicKey,
    protocol,
    collateralMint,
  } = params;

  const [collateralInfoPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('collateral_info'), payer.publicKey.toBuffer()],
    rfqProgram.address
  );
  const [collateralTokenPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('collateral_token'), payer.publicKey.toBuffer()],
    rfqProgram.address
  );

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .add({
      instruction: createInitializeCollateralInstruction(
        {
          user: payer.publicKey,
          protocol,
          collateralInfo: collateralInfoPda,
          collateralToken: collateralTokenPda,
          collateralMint,
          systemProgram: systemProgram.address,
          tokenProgram: tokenProgram.address,
        },
        rfqProgram.address
      ),
      signers: [payer],
      key: 'initializeCollateral',
    });
};
