import { Keypair, PublicKey } from '@solana/web3.js';

import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { MintAuthorityMustBeSignerToMintInitialSupplyError } from '../errors';
import { TokenWithMint } from '../models/Token';
import {
  TransactionBuilder,
  TransactionBuilderOptions,
} from '../../../utils/TransactionBuilder';
import { Option } from '../../../utils/types';
import {
  isSigner,
  makeConfirmOptionsFinalizedOnMainnet,
  Operation,
  OperationHandler,
  OperationScope,
  Signer,
  SplTokenAmount,
  toPublicKey,
  useOperation,
} from '../../../types';
import type { Convergence } from '../../../Convergence';
import { addComputeBudgetIxsIfNeeded } from '@/utils/helpers';

const Key = 'CreateTokenWithMintOperation' as const;

/**
 * Creates both mint and token accounts in the same transaction.
 *
 * ```ts
 * const { token } = await convergence.tokens().createTokenWithMint();
 * const mint = token.mint;
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const createTokenWithMintOperation =
  useOperation<CreateTokenWithMintOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type CreateTokenWithMintOperation = Operation<
  typeof Key,
  CreateTokenWithMintInput,
  CreateTokenWithMintOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type CreateTokenWithMintInput = {
  /**
   * The number of decimal points used to define token amounts.
   *
   * @defaultValue `0`
   */
  decimals?: number;

  /**
   * The initial amount of tokens to mint to the new token account.
   *
   * @defaultValue `0`
   */
  initialSupply?: SplTokenAmount;

  /**
   * The address of the new mint account as a Signer.
   *
   * @defaultValue `Keypair.generate()`
   */
  mint?: Signer;

  /**
   * The address of the authority that is allowed
   * to mint new tokens to token accounts.
   *
   * It may be required as a Signer in order to
   * mint the initial supply.
   *
   * @defaultValue `convergence.identity()`
   */
  mintAuthority?: Signer | PublicKey;

  /**
   * The address of the authority that is allowed
   * to freeze token accounts.
   *
   * @defaultValue `convergence.identity().publicKey`
   */
  freezeAuthority?: Option<PublicKey>;

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
export type CreateTokenWithMintOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;

  /** The new mint account as a Signer. */
  mintSigner: Signer;

  /**
   * A model representing the newly created token
   * account and its associated mint account.
   */
  token: TokenWithMint;
};

/**
 * @group Operations
 * @category Handlers
 */
export const createTokenWithMintOperationHandler: OperationHandler<CreateTokenWithMintOperation> =
  {
    async handle(
      operation: CreateTokenWithMintOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<CreateTokenWithMintOutput> {
      const builder = await createTokenWithMintBuilder(
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

      const token = await convergence.tokens().findTokenWithMintByMint(
        {
          mint: output.mintSigner.publicKey,
          address: output.tokenAddress,
          addressType: 'token',
        },
        scope
      );

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
export type CreateTokenWithMintBuilderParams = Omit<
  CreateTokenWithMintInput,
  'confirmOptions'
> & {
  /** A key to distinguish the instruction that creates the mint account. */
  createMintAccountInstructionKey?: string;

  /** A key to distinguish the instruction that initializes the mint account. */
  initializeMintInstructionKey?: string;

  /** A key to distinguish the instruction that creates the associates token account. */
  createAssociatedTokenAccountInstructionKey?: string;

  /** A key to distinguish the instruction that creates the token account. */
  createTokenAccountInstructionKey?: string;

  /** A key to distinguish the instruction that initializes the token account. */
  initializeTokenInstructionKey?: string;

  /** A key to distinguish the instruction that mints tokens to the token account. */
  mintTokensInstructionKey?: string;
};

/**
 * @group Transaction Builders
 * @category Contexts
 */
export type CreateTokenWithMintBuilderContext = {
  /** The mint account to create as a Signer. */
  mintSigner: Signer;

  /** The computed address of the token account to create. */
  tokenAddress: PublicKey;
};

/**
 * Creates both mint and token accounts in the same transaction.
 *
 * ```ts
 * const transactionBuilder = await convergence.tokens().builders().createTokenWithMint();
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const createTokenWithMintBuilder = async (
  convergence: Convergence,
  params: CreateTokenWithMintBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<TransactionBuilder<CreateTokenWithMintBuilderContext>> => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const {
    decimals = 0,
    initialSupply,
    mint = Keypair.generate(),
    mintAuthority = convergence.identity(),
    freezeAuthority = convergence.identity().publicKey,
    owner = convergence.identity().publicKey,
    token,
  } = params;

  const createMintBuilder = await convergence
    .tokens()
    .builders()
    .createMint(
      {
        decimals,
        mint,
        mintAuthority: toPublicKey(mintAuthority),
        freezeAuthority,
        createAccountInstructionKey:
          params.createMintAccountInstructionKey ?? 'createMintAccount',
        initializeMintInstructionKey:
          params.initializeMintInstructionKey ?? 'initializeMint',
      },
      { programs, payer }
    );

  const createTokenBuilder = await convergence
    .tokens()
    .builders()
    .createToken(
      {
        mint: mint.publicKey,
        owner,
        token,
        createAssociatedTokenAccountInstructionKey:
          params.createAssociatedTokenAccountInstructionKey ??
          'createAssociatedTokenAccount',
        createAccountInstructionKey:
          params.createTokenAccountInstructionKey ?? 'createTokenAccount',
        initializeTokenInstructionKey:
          params.initializeTokenInstructionKey ?? 'initializeToken',
      },
      { payer, programs }
    );

  const { tokenAddress } = createTokenBuilder.getContext();

  const builder = TransactionBuilder.make<CreateTokenWithMintBuilderContext>()
    .setFeePayer(payer)
    .setContext({ mintSigner: mint, tokenAddress })

    // Create the Mint account.
    .add(createMintBuilder)

    // Create the Token account.
    .add(createTokenBuilder);

  await addComputeBudgetIxsIfNeeded(builder, convergence);
  // Potentially mint the initial supply to the token account.
  if (!!initialSupply) {
    if (!isSigner(mintAuthority)) {
      throw new MintAuthorityMustBeSignerToMintInitialSupplyError();
    }

    builder.add(
      await convergence
        .tokens()
        .builders()
        .mint(
          {
            mintAddress: mint.publicKey,
            toToken: tokenAddress,
            amount: initialSupply,
            mintAuthority,
            mintTokensInstructionKey:
              params.mintTokensInstructionKey ?? 'mintTokens',
          },
          { payer, programs }
        )
    );
  }

  return builder;
};
