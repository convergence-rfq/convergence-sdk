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
} from '../../../types';
import { Convergence } from '../../../Convergence';
import { TransactionBuilder, TransactionBuilderOptions } from '../../../utils';
import { protocolCache } from '../../protocolModule/cache';

const Key = 'InitializeCollateralOperation' as const;

/**
 * Initializes a collateral account.
 *
 * ```ts
 * const rfq = await convergence
 *   .collateral()
 *   .initializeCollateral();
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
  user?: Signer;

  /**
   * The address of the protocol.
   *
   * @defaultValue `convergence.protocol().pdas().protocol()`
   */
  protocol?: PublicKey;

  /**
   * The address of the collateral mint.
   *
   * @defaultValue `protocol.collateralMint`
   */
  collateralMint?: PublicKey;

  /**
   * Optional address of the User's collateral tokens account.
   *
   * @defaultValue `convergence
   *   .collateral()
   *   .pdas().
   *   collateralTokens({
   *     user: <publicKey>,
   *   })`
   */
  collateralToken?: PublicKey;

  /**
   * Optional address of the User's collateral info account.
   *
   * @defaultValue `convergence.collateral().pdas().collateralInfo({ user: <publicKey> })`
   */
  collateralInfo?: PublicKey;
};

/**
 * @group Operations
 * @category Outputs
 */
export type InitializeCollateralOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;

  /** The newly created collateral account */
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
      const { user = convergence.identity() } = operation.input;

      const builder = await initializeCollateralBuilder(
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

      const account = await convergence
        .rpc()
        .getAccount(
          convergence
            .collateral()
            .pdas()
            .collateralInfo({ user: user.publicKey }),
          commitment
        );
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
  const protocolModel = await protocolCache.get(convergence);
  const { programs } = options;
  const {
    user = convergence.identity(),
    protocol = convergence.protocol().pdas().protocol(),
    collateralMint = protocolModel.collateralMint,
    collateralToken = convergence
      .collateral()
      .pdas()
      .collateralToken({ user: user.publicKey }),
    collateralInfo = convergence
      .collateral()
      .pdas()
      .collateralInfo({ user: user.publicKey }),
  } = params;

  return TransactionBuilder.make<InitializeCollateralBuilderContext>()
    .setFeePayer(user)
    .add({
      instruction: createInitializeCollateralInstruction(
        {
          protocol,
          collateralMint,
          collateralToken,
          collateralInfo,
          user: user.publicKey,
        },
        convergence.programs().getRfq(programs).address
      ),
      signers: [user],
      key: 'initializeCollateral',
    });
};
