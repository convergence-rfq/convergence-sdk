import { PublicKey } from '@solana/web3.js';
import { createInitializeCollateralInstruction } from '@convergence-rfq/rfq';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
//import { Collateral, toCollateral } from '../models';
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
   * @defaultValue `convergence.identity().publicKey`
   */
  user: Signer;

  /** The address of the protocol */
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
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;

  /** The newly created Collateral account */
  //collateral: Collateral;
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
      scope.throwIfCanceled();

      const builder = await initializeCollateralBuilder(
        convergence,
        operation.input,
        scope
      );
      scope.throwIfCanceled();

      const confirmOptions = makeConfirmOptionsFinalizedOnMainnet(
        convergence,
        scope.confirmOptions
      );

      const output = await builder.sendAndConfirm(convergence, confirmOptions);
      scope.throwIfCanceled();

      //const collateral = toCollateral(operation.input.collateralInfo);

      return { ...output };
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
    user = convergence.identity(),
    protocol,
    collateralToken,
    collateralMint,
    collateralInfo,
  } = params;

  return TransactionBuilder.make()
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
