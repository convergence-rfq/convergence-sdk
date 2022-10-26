import { createMintNewEditionFromMasterEditionViaTokenInstruction } from '@metaplex-foundation/mpl-token-metadata';
import { Keypair, PublicKey } from '@solana/web3.js';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { toOriginalEditionAccount } from '../accounts';
import {
  assertRfqWithToken,
  RfqWithToken,
  toNftOriginalEdition,
} from '../models';
import { TransactionBuilder, TransactionBuilderOptions } from '@/utils';
import {
  BigNumber,
  makeConfirmOptionsFinalizedOnMainnet,
  Operation,
  OperationHandler,
  OperationScope,
  Signer,
  toBigNumber,
  token,
  useOperation,
} from '@/types';
import { Convergence } from '@/Convergence';

// -----------------
// Operation
// -----------------

const Key = 'PrintNewEditionOperation' as const;

/**
 * Prints a new edition from an original NFT.
 *
 * ```ts
 * const { nft } = await convergence
 *   .rfqs()
 *   .printNewEdition({ originalMint };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const printNewEditionOperation =
  useOperation<PrintNewEditionOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type PrintNewEditionOperation = Operation<
  typeof Key,
  PrintNewEditionInput,
  PrintNewEditionOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type PrintNewEditionInput = {
  /** The address of the original NFT. */
  originalMint: PublicKey;

  /**
   * The owner of the original NFT as a Signer.
   *
   * @defaultValue `convergence.identity()`
   */
  originalTokenAccountOwner?: Signer;

  /**
   * The address of the original NFT's token account.
   *
   * @defaultValue Defaults to using the associated token account
   * from the `originalMint` and `originalTokenAccountOwner` parameters.
   */
  originalTokenAccount?: PublicKey;

  /**
   * The address of the new mint account as a Signer.
   * This is useful if you already have a generated Keypair
   * for the mint account of the Print NFT to create.
   *
   * @defaultValue `Keypair.generate()`
   */
  newMint?: Signer;

  /**
   * The update authority of the new printed NFT.
   *
   * Depending on your use-case, you might want to change that to
   * the `updateAuthority` of the original NFT.
   *
   * @defaultValue `convergence.identity()`
   */
  newUpdateAuthority?: PublicKey;

  /**
   * The owner of the new printed NFT.
   *
   * @defaultValue `convergence.identity().publicKey`
   */
  newOwner?: PublicKey;

  /**
   * The address of the new printed NFT's token account.
   *
   * @defaultValue Defaults to using the associated token account
   * from the `originalMint` and `newOwner` parameters.
   */
  newTokenAccount?: Signer;
};

/**
 * @group Operations
 * @category Outputs
 */
export type PrintNewEditionOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;

  /** The newly created NFT and its associated token. */
  nft: RfqWithToken;

  /** The created mint account as a Signer. */
  mintSigner: Signer;

  /** The address of the metadata account. */
  metadataAddress: PublicKey;

  /** The address of the edition account. */
  editionAddress: PublicKey;

  /** The address of the token account. */
  tokenAddress: PublicKey;

  /** The new supply of the original NFT. */
  updatedSupply: BigNumber;
};

/**
 * @group Operations
 * @category Handlers
 */
export const printNewEditionOperationHandler: OperationHandler<PrintNewEditionOperation> =
  {
    handle: async (
      operation: PrintNewEditionOperation,
      convergence: Convergence,
      scope: OperationScope
    ) => {
      const originalEditionAccount = await convergence.rpc().getAccount(
        convergence.rfqs().pdas().masterEdition({
          mint: operation.input.originalMint,
          programs: scope.programs,
        })
      );
      scope.throwIfCanceled();

      const originalEdition = toNftOriginalEdition(
        toOriginalEditionAccount(originalEditionAccount)
      );
      const builder = await printNewEditionBuilder(
        convergence,
        { ...operation.input, originalSupply: originalEdition.supply },
        scope
      );
      scope.throwIfCanceled();

      const confirmOptions = makeConfirmOptionsFinalizedOnMainnet(
        convergence,
        scope.confirmOptions
      );
      const output = await builder.sendAndConfirm(convergence, confirmOptions);
      scope.throwIfCanceled();

      const nft = await convergence.rfqs().findByMint(
        {
          mintAddress: output.mintSigner.publicKey,
          tokenAddress: output.tokenAddress,
        },
        scope
      );
      scope.throwIfCanceled();

      assertRfqWithToken(nft);
      return { ...output, nft };
    },
  };

// -----------------
// Builder
// -----------------

/**
 * @group Transaction Builders
 * @category Inputs
 */
export type PrintNewEditionBuilderParams = Omit<
  PrintNewEditionInput,
  'confirmOptions'
> & {
  /** The current supply of the original edition. */
  originalSupply: BigNumber;

  /** A key to distinguish the instruction that creates the mint account. */
  createMintAccountInstructionKey?: string;

  /** A key to distinguish the instruction that initializes the mint account. */
  initializeMintInstructionKey?: string;

  /** A key to distinguish the instruction that creates the associated token account. */
  createAssociatedTokenAccountInstructionKey?: string;

  /** A key to distinguish the instruction that creates the token account. */
  createTokenAccountInstructionKey?: string;

  /** A key to distinguish the instruction that initializes the token account. */
  initializeTokenInstructionKey?: string;

  /** A key to distinguish the instruction that mints tokens. */
  mintTokensInstructionKey?: string;

  /** A key to distinguish the instruction that prints the new edition. */
  printNewEditionInstructionKey?: string;
};

/**
 * @group Transaction Builders
 * @category Contexts
 */
export type PrintNewEditionBuilderContext = Omit<
  PrintNewEditionOutput,
  'response' | 'nft'
>;

/**
 * Prints a new edition from an original NFT.
 *
 * ```ts
 * const transactionBuilder = await convergence
 *   .rfqs()
 *   .builders()
 *   .printNewEdition({ originalMint });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const printNewEditionBuilder = async (
  convergence: Convergence,
  params: PrintNewEditionBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<TransactionBuilder<PrintNewEditionBuilderContext>> => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const {
    originalMint,
    newMint = Keypair.generate(),
    newUpdateAuthority = convergence.identity().publicKey,
    newOwner = convergence.identity().publicKey,
    newTokenAccount,
    printNewEditionInstructionKey = 'printNewEdition',
  } = params;

  // Programs.
  const tokenMetadataProgram = convergence
    .programs()
    .getTokenMetadata(programs);

  // Original NFT.
  const originalMetadataAddress = convergence.rfqs().pdas().metadata({
    mint: originalMint,
    programs,
  });
  const originalEditionAddress = convergence.rfqs().pdas().masterEdition({
    mint: originalMint,
    programs,
  });
  const edition = toBigNumber(params.originalSupply.addn(1));
  const originalEditionMarkPda = convergence.rfqs().pdas().editionMarker({
    mint: originalMint,
    edition,
    programs,
  });

  // New NFT.
  const newMintAuthority = Keypair.generate(); // Will be overwritten by edition PDA.
  const newMetadataAddress = convergence.rfqs().pdas().metadata({
    mint: newMint.publicKey,
    programs,
  });
  const newEditionAddress = convergence.rfqs().pdas().edition({
    mint: newMint.publicKey,
    programs,
  });
  const sharedAccounts = {
    newMetadata: newMetadataAddress,
    newEdition: newEditionAddress,
    masterEdition: originalEditionAddress,
    newMint: newMint.publicKey,
    editionMarkPda: originalEditionMarkPda,
    newMintAuthority: newMintAuthority.publicKey,
    payer: payer.publicKey,
    newMetadataUpdateAuthority: newUpdateAuthority,
    metadata: originalMetadataAddress,
  };

  const tokenWithMintBuilder = await convergence
    .tokens()
    .builders()
    .createTokenWithMint(
      {
        decimals: 0,
        initialSupply: token(1),
        mint: newMint,
        mintAuthority: newMintAuthority,
        freezeAuthority: newMintAuthority.publicKey,
        owner: newOwner,
        token: newTokenAccount,
        createMintAccountInstructionKey: params.createMintAccountInstructionKey,
        initializeMintInstructionKey: params.initializeMintInstructionKey,
        createAssociatedTokenAccountInstructionKey:
          params.createAssociatedTokenAccountInstructionKey,
        createTokenAccountInstructionKey:
          params.createTokenAccountInstructionKey,
        initializeTokenInstructionKey: params.initializeTokenInstructionKey,
        mintTokensInstructionKey: params.mintTokensInstructionKey,
      },
      { payer, programs }
    );

  const { tokenAddress } = tokenWithMintBuilder.getContext();
  const originalTokenAccountOwner =
    params.originalTokenAccountOwner ?? convergence.identity();
  const originalTokenAccount =
    params.originalTokenAccount ??
    convergence.tokens().pdas().associatedTokenAccount({
      mint: originalMint,
      owner: originalTokenAccountOwner.publicKey,
      programs,
    });

  return (
    TransactionBuilder.make<PrintNewEditionBuilderContext>()
      .setFeePayer(payer)
      .setContext({
        mintSigner: newMint,
        metadataAddress: newMetadataAddress,
        editionAddress: newEditionAddress,
        tokenAddress,
        updatedSupply: edition,
      })

      // Create the mint and token accounts before minting 1 token to the owner.
      .add(tokenWithMintBuilder)

      // Mint new edition.
      .add({
        instruction: createMintNewEditionFromMasterEditionViaTokenInstruction(
          {
            ...sharedAccounts,
            tokenAccountOwner: originalTokenAccountOwner.publicKey,
            tokenAccount: originalTokenAccount,
          },
          { mintNewEditionFromMasterEditionViaTokenArgs: { edition } },
          tokenMetadataProgram.address
        ),
        signers: [newMint, newMintAuthority, payer, originalTokenAccountOwner],
        key: printNewEditionInstructionKey,
      })
  );
};
