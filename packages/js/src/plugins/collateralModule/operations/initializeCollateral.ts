import { PublicKey } from '@solana/web3.js';
import { createInitializeCollateralInstruction } from '@convergence-rfq/rfq';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { assertCollateral, Collateral, toCollateral } from '../models';
import { toCollateralAccount } from '../accounts';
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
   * @defaultValue `convergence.identity()`
   */
  user: Signer;

  /** The address of the protocol*/
  protocol?: PublicKey;

  collateralMint: PublicKey;

  collateralToken?: PublicKey;

  collateralInfo?: PublicKey;
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
      const { user } = operation.input;
      scope.throwIfCanceled();

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

      const rfqProgram = convergence.programs().getRfq();

      const [collateralPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('collateral_info'), user.publicKey.toBuffer()],
        rfqProgram.address
      );

      const account = await convergence
        .rpc()
        .getAccount(collateralPda, commitment);
      scope.throwIfCanceled();

      const collateral = toCollateral(toCollateralAccount(account));
      assertCollateral(collateral);

      return { ...output, collateral };
    },
  };

export type InitializeCollateralBuilderParams = InitializeCollateralInput;

/**
 * @group Transaction Builders
 * @category Contexts
 */
export type InitializeCollateralBuilderContext = Omit<
  InitializeCollateralOutput,
  'collateral'
>;

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
): Promise<TransactionBuilder<InitializeCollateralBuilderContext>> => {
  const { programs } = options;
  const rfqProgram = convergence.programs().getRfq(programs);
  const { user, collateralMint } = params;

  // TODO: Swap out with a real PDA client, also, is there a way to get this from Solita?
  const [protocol] = PublicKey.findProgramAddressSync(
    [Buffer.from('protocol')],
    rfqProgram.address
  );
  const [collateralToken] = PublicKey.findProgramAddressSync(
    [Buffer.from('collateral_token'), user.publicKey.toBuffer()],
    rfqProgram.address
  );
  const [collateralInfo] = PublicKey.findProgramAddressSync(
    [Buffer.from('collateral_info'), user.publicKey.toBuffer()],
    rfqProgram.address
  );

  return TransactionBuilder.make<InitializeCollateralBuilderContext>()
    .setFeePayer(user)
    .add({
      instruction: createInitializeCollateralInstruction(
        {
          user: user.publicKey,
          protocol,
          collateralMint,
          collateralToken,
          collateralInfo,
        },
        rfqProgram.address
      ),
      signers: [user],
      key: 'initializeCollateral',
    });
};
