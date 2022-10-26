import { createMintToInstruction } from '@solana/spl-token';
import { PublicKey } from '@solana/web3.js';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import type { Convergence } from '@/Convergence';
import {
  isSigner,
  KeypairSigner,
  Operation,
  OperationHandler,
  OperationScope,
  Signer,
  SplTokenAmount,
  toPublicKey,
  useOperation,
} from '@/types';
import { TransactionBuilder, TransactionBuilderOptions } from '@/utils';

// -----------------
// Operation
// -----------------

const Key = 'MintTokensOperation' as const;

/**
 * Mint tokens to an account.
 *
 * ```ts
 * await convergence
 *   .tokens()
 *   .mint({
 *     mintAddress,
 *     toOwner,
 *     amount: token(100),
 *   };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const mintTokensOperation = useOperation<MintTokensOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type MintTokensOperation = Operation<
  typeof Key,
  MintTokensInput,
  MintTokensOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type MintTokensInput = {
  /** The address of the mint account. */
  mintAddress: PublicKey;

  /** The amount of tokens to mint. */
  amount: SplTokenAmount;

  /**
   * The owner of the token account to mint to.
   *
   * @defaultValue `convergence.identity().publicKey`
   */
  toOwner?: PublicKey;

  /**
   * The address of the token account to mint to.
   *
   * Note that this may be required as a `Signer` if the destination
   * token account does not exist and we need to create it before
   * minting the tokens.
   *
   * @defaultValue Defaults to using the associated token account
   * from the `mintAddress` and `toOwner` parameters.
   */
  toToken?: PublicKey | Signer;

  /**
   * The authority that is allowed to mint new tokens as a Signer.
   *
   * This may be provided as a PublicKey if and only if
   * the `multiSigners` parameter is provided.
   *
   * @defaultValue `convergence.identity()`
   */
  mintAuthority?: PublicKey | Signer;

  /**
   * The signing accounts to use if the mint authority is a multisig.
   *
   * @defaultValue `[]`
   */
  multiSigners?: KeypairSigner[];
};

/**
 * @group Operations
 * @category Outputs
 */
export type MintTokensOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const mintTokensOperationHandler: OperationHandler<MintTokensOperation> =
  {
    async handle(
      operation: MintTokensOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<MintTokensOutput> {
      const { programs, confirmOptions } = scope;
      const {
        mintAddress,
        toOwner = convergence.identity().publicKey,
        toToken,
      } = operation.input;

      const destination =
        toToken ??
        convergence.tokens().pdas().associatedTokenAccount({
          mint: mintAddress,
          owner: toOwner,
          programs,
        });
      const destinationAddress = toPublicKey(destination);
      const destinationAccountExists = await convergence
        .rpc()
        .accountExists(destinationAddress);
      scope.throwIfCanceled();

      const builder = await mintTokensBuilder(
        convergence,
        { ...operation.input, toTokenExists: destinationAccountExists },
        scope
      );
      scope.throwIfCanceled();

      return builder.sendAndConfirm(convergence, confirmOptions);
    },
  };

// -----------------
// Builder
// -----------------

/**
 * @group Transaction Builders
 * @category Inputs
 */
export type MintTokensBuilderParams = Omit<
  MintTokensInput,
  'confirmOptions'
> & {
  /**
   * Whether or not the provided token account already exists.
   * If `false`, we'll add another instruction to create it.
   *
   * @defaultValue `true`
   */
  toTokenExists?: boolean;

  /** A key to distinguish the instruction that creates the associated token account. */
  createAssociatedTokenAccountInstructionKey?: string;

  /** A key to distinguish the instruction that creates the token account. */
  createAccountInstructionKey?: string;

  /** A key to distinguish the instruction that initializes the token account. */
  initializeTokenInstructionKey?: string;

  /** A key to distinguish the instruction that mints tokens. */
  mintTokensInstructionKey?: string;
};

/**
 * Mint tokens to an account.
 *
 * ```ts
 * const transactionBuilder = await convergence
 *   .tokens()
 *   .builders()
 *   .mint({
 *     mintAddress,
 *     toOwner,
 *     amount: token(100),
 *   });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const mintTokensBuilder = async (
  convergence: Convergence,
  params: MintTokensBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<TransactionBuilder> => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const {
    mintAddress,
    amount,
    toOwner = convergence.identity().publicKey,
    toToken,
    toTokenExists = true,
    mintAuthority = convergence.identity(),
    multiSigners = [],
  } = params;

  const [mintAuthorityPublicKey, signers] = isSigner(mintAuthority)
    ? [mintAuthority.publicKey, [mintAuthority]]
    : [mintAuthority, multiSigners];

  const tokenProgram = convergence.programs().getToken(programs);
  const destination =
    toToken ??
    convergence.tokens().pdas().associatedTokenAccount({
      mint: mintAddress,
      owner: toOwner,
      programs,
    });

  return (
    TransactionBuilder.make()

      // Create token account if missing.
      .add(
        await convergence
          .tokens()
          .builders()
          .createTokenIfMissing(
            {
              ...params,
              mint: mintAddress,
              owner: toOwner,
              token: toToken,
              tokenExists: toTokenExists,
              tokenVariable: 'toToken',
            },
            { payer, programs }
          )
      )

      // Mint tokens.
      .add({
        instruction: createMintToInstruction(
          mintAddress,
          toPublicKey(destination),
          mintAuthorityPublicKey,
          amount.basisPoints.toNumber(),
          multiSigners,
          tokenProgram.address
        ),
        signers,
        key: params.mintTokensInstructionKey ?? 'mintTokens',
      })
  );
};
