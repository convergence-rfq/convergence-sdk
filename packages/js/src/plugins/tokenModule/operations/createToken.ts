import {
  ACCOUNT_SIZE,
  createAssociatedTokenAccountInstruction,
  createInitializeAccountInstruction,
} from '@solana/spl-token';
import { PublicKey } from '@solana/web3.js';

import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { Token } from '../models/Token';
import { ExpectedSignerError } from '../../../errors';
import type { Convergence } from '../../../Convergence';
import {
  isSigner,
  makeConfirmOptionsFinalizedOnMainnet,
  Operation,
  OperationHandler,
  OperationScope,
  Signer,
  toPublicKey,
  useOperation,
} from '../../../types';
import {
  TransactionBuilder,
  TransactionBuilderOptions,
} from '../../../utils/TransactionBuilder';

const Key = 'CreateTokenOperation' as const;

/**
 * Creates a new token account.
 *
 * ```ts
 * const { token } = await convergence.tokens().createToken({ mint });
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const createTokenOperation = useOperation<CreateTokenOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type CreateTokenOperation = Operation<
  typeof Key,
  CreateTokenInput,
  CreateTokenOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type CreateTokenInput = {
  /**
   * The address of the mint account associated
   * with the new token account.
   */
  mint: PublicKey;

  /**
   * The address of the owner of the new token account.
   *
   * @defaultValue `convergence.identity().publicKey`
   */
  owner?: PublicKey;

  /**
   * The token account as a Signer if we want to create
   * a new token account with a specific address instead of
   * creating a new associated token account.
   *
   * @defaultValue Defaults to creating a new associated token account
   * using the `mint` and `owner` parameters.
   */
  token?: Signer;
};

/**
 * @group Operations
 * @category Outputs
 */
export type CreateTokenOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;

  /** The newly created token account. */
  token: Token;
};

/**
 * @group Operations
 * @category Handlers
 */
export const createTokenOperationHandler: OperationHandler<CreateTokenOperation> =
  {
    async handle(
      operation: CreateTokenOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<CreateTokenOutput> {
      const builder = await createTokenBuilder(
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

      const token = await convergence
        .tokens()
        .findTokenByAddress({ address: output.tokenAddress }, scope);

      return { ...output, token };
    },
  };

// -----------------
// Builder
// -----------------

/**
 * @group Transaction Builders
 * @category Inputs
 */
export type CreateTokenBuilderParams = Omit<
  CreateTokenInput,
  'confirmOptions'
> & {
  /** A key to distinguish the instruction that creates the associated token account. */
  createAssociatedTokenAccountInstructionKey?: string;

  /** A key to distinguish the instruction that creates the account. */
  createAccountInstructionKey?: string;

  /** A key to distinguish the instruction that initializes the token account. */
  initializeTokenInstructionKey?: string;
};

/**
 * @group Transaction Builders
 * @category Contexts
 */
export type CreateTokenBuilderContext = {
  /** The computed address of the token account to create. */
  tokenAddress: PublicKey;
};

/**
 * Creates a new token account.
 *
 * ```ts
 * const transactionBuilder = await convergence.tokens().builders().createToken({ mint });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const createTokenBuilder = async (
  convergence: Convergence,
  params: CreateTokenBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<TransactionBuilder<CreateTokenBuilderContext>> => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const { mint, owner = convergence.identity().publicKey, token } = params;

  const tokenProgram = convergence.programs().getToken(programs);
  const associatedTokenProgram = convergence
    .programs()
    .getAssociatedToken(programs);

  const isAssociatedToken = token === undefined;
  const builder =
    TransactionBuilder.make<CreateTokenBuilderContext>().setFeePayer(payer);

  if (isAssociatedToken) {
    const associatedTokenAddress = convergence
      .tokens()
      .pdas()
      .associatedTokenAccount({ mint, owner, programs });

    return (
      builder
        .setContext({ tokenAddress: associatedTokenAddress })

        // Create an associated token account.
        .add({
          instruction: createAssociatedTokenAccountInstruction(
            payer.publicKey,
            associatedTokenAddress,
            owner,
            mint,
            tokenProgram.address,
            associatedTokenProgram.address
          ),
          signers: [payer],
          key:
            params.createAssociatedTokenAccountInstructionKey ??
            'createAssociatedTokenAccount',
        })
    );
  }

  return (
    builder
      .setFeePayer(payer)
      .setContext({ tokenAddress: token.publicKey })

      // Create an empty account for the Token.
      .add(
        await convergence
          .system()
          .builders()
          .createAccount(
            {
              newAccount: token,
              space: ACCOUNT_SIZE,
              program: tokenProgram.address,
              instructionKey:
                params.createAccountInstructionKey ?? 'createAccount',
            },
            { payer, programs }
          )
      )

      // Initialize the Token.
      .add({
        instruction: createInitializeAccountInstruction(
          token.publicKey,
          mint,
          owner,
          tokenProgram.address
        ),
        signers: [token],
        key: params.initializeTokenInstructionKey ?? 'initializeToken',
      })
  );
};

/**
 * @group Transaction Builders
 * @category Inputs
 */
export type CreateTokenIfMissingBuilderParams = Omit<
  CreateTokenBuilderParams,
  'token'
> & {
  /**
   * The token account to create if it does not exist.
   * Here, it may be passed as a PublicKey if and only
   * if it already exists.
   */
  token?: PublicKey | Signer;

  /**
   * Whether or not the token account exists.
   *
   * @defaultValue `true`
   */
  tokenExists?: boolean;

  /**
   * The name of the token variable on the operation that uses
   * this helper token builder.
   *
   * @defaultValue `"token"`
   */
  tokenVariable?: string;
};

/**
 * @group Transaction Builders
 * @category Constructors
 * @internal
 */
export const createTokenIfMissingBuilder = async (
  convergence: Convergence,
  params: CreateTokenIfMissingBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<TransactionBuilder<CreateTokenBuilderContext>> => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const {
    mint,
    owner = convergence.identity().publicKey,
    token,
    tokenExists = true,
    tokenVariable = 'token',
  } = params;

  const destination =
    token ??
    convergence
      .tokens()
      .pdas()
      .associatedTokenAccount({ mint, owner, programs });
  const destinationAddress = toPublicKey(destination);
  const builder = TransactionBuilder.make<CreateTokenBuilderContext>()
    .setFeePayer(payer)
    .setContext({ tokenAddress: destinationAddress });

  if (tokenExists) {
    return builder;
  }

  // When creating a token account, ensure it is passed as a Signer.
  if (token && !isSigner(token)) {
    throw new ExpectedSignerError(tokenVariable, 'PublicKey', {
      problemSuffix:
        `The provided "${tokenVariable}" account ` +
        `at address [${destinationAddress}] does not exist. ` +
        'Therefore, it needs to be created and passed as a Signer.',
      solution:
        `If you want to create the "${tokenVariable}" account, then please pass it as a Signer. ` +
        'Alternatively, you can pass the owner account as a PublicKey instead to ' +
        'use (or create) an associated token account.',
    });
  }

  return builder.add(
    await convergence
      .tokens()
      .builders()
      .createToken(
        {
          ...params,
          mint,
          owner,
          token,
        },
        { programs, payer }
      )
  );
};
