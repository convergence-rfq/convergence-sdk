import {
  createCreateMasterEditionV3Instruction,
  Uses,
} from '@metaplex-foundation/mpl-token-metadata';
import { Keypair, PublicKey } from '@solana/web3.js';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { assertRfqWithToken, RfqWithToken } from '../models';
import { Option, TransactionBuilder, TransactionBuilderOptions } from '@/utils';
import {
  BigNumber,
  CreatorInput,
  makeConfirmOptionsFinalizedOnMainnet,
  Operation,
  OperationHandler,
  OperationScope,
  Signer,
  toPublicKey,
  useOperation,
} from '@/types';
import { Convergence } from '@/Convergence';

// -----------------
// Operation
// -----------------

const Key = 'CreateRfqOperation' as const;

/**
 * Creates a new Rfq.
 *
 * ```ts
 * const { rfq } = await convergence
 *   .rfqs()
 *   .create({
 *     name: 'My Rfq',
 *     uri: 'https://example.com/my-rfq',
 *     sellerFeeBasisPoints: 250, // 2.5%
 *   };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const createRfqOperation = useOperation<CreateRfqOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type CreateRfqOperation = Operation<
  typeof Key,
  CreateRfqInput,
  CreateRfqOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type CreateRfqInput = {
  /**
   * The authority that will be able to make changes
   * to the created Rfq.
   *
   * This is required as a Signer because creating the master
   * edition account requires the update authority to sign
   * the transaction.
   *
   * @defaultValue `convergence.identity()`
   */
  updateAuthority?: Signer;

  /**
   * The authority that is currently allowed to mint new tokens
   * for the provided mint account.
   *
   * Note that this is only relevant if the `useExistingMint` parameter
   * if provided.
   *
   * @defaultValue `convergence.identity()`
   */
  mintAuthority?: Signer;

  /**
   * The address of the new mint account as a Signer.
   * This is useful if you already have a generated Keypair
   * for the mint account of the Rfq to create.
   *
   * @defaultValue `Keypair.generate()`
   */
  useNewMint?: Signer;

  /**
   * The address of the existing mint account that should be converted
   * into an Rfq. The account at this address should have the right
   * requirements to become an Rfq, e.g. its supply should contains
   * exactly 1 token.
   *
   * @defaultValue Defaults to creating a new mint account with the
   * right requirements.
   */
  useExistingMint?: PublicKey;

  /**
   * The owner of the Rfq to create.
   *
   * @defaultValue `convergence.identity().publicKey`
   */
  tokenOwner?: PublicKey;

  /**
   * The token account linking the mint account and the token owner
   * together. By default, the associated token account will be used.
   *
   * If the provided token account does not exist, it must be passed as
   * a Signer as we will need to create it before creating the Rfq.
   *
   * @defaultValue Defaults to creating a new associated token account
   * using the `mintAddress` and `tokenOwner` parameters.
   */
  tokenAddress?: PublicKey | Signer;

  /** The URI that points to the JSON metadata of the asset. */
  uri: string;

  /** The on-chain name of the asset, e.g. "My Rfq #123". */
  name: string;

  /**
   * The royalties in percent basis point (i.e. 250 is 2.5%) that
   * should be paid to the creators on each secondary sale.
   */
  sellerFeeBasisPoints: number;

  /**
   * The on-chain symbol of the asset, stored in the Metadata account.
   * E.g. "MYRfq".
   *
   * @defaultValue `""`
   */
  symbol?: string;

  /**
   * {@inheritDoc CreatorInput}
   * @defaultValue
   * Defaults to using the provided `updateAuthority` as the only verified creator.
   * ```ts
   * [{
   *   address: updateAuthority.publicKey,
   *   authority: updateAuthority,
   *   share: 100,
   * }]
   * ```
   */
  creators?: CreatorInput[];

  /**
   * Whether or not the Rfq's metadata is mutable.
   * When set to `false` no one can update the Metadata account,
   * not even the update authority.
   *
   * @defaultValue `true`
   */
  isMutable?: boolean;

  /**
   * The maximum supply of printed editions.
   * When this is `null`, an unlimited amount of editions
   * can be printed from the original edition.
   *
   * @defaultValue `toBigNumber(0)`
   */
  maxSupply?: Option<BigNumber>;

  /**
   * When this field is not `null`, it indicates that the Rfq
   * can be "used" by its owner or any approved "use authorities".
   *
   * @defaultValue `null`
   */
  uses?: Option<Uses>;

  /**
   * Whether the created Rfq is a Collection Rfq.
   * When set to `true`, the Rfq will be created as a
   * Sized Collection Rfq with an initial size of 0.
   *
   * @defaultValue `false`
   */
  isCollection?: boolean;

  /**
   * The Collection Rfq that this new Rfq belongs to.
   * When `null`, the created Rfq will not be part of a collection.
   *
   * @defaultValue `null`
   */
  collection?: Option<PublicKey>;

  /**
   * The collection authority that should sign the created Rfq
   * to prove that it is part of the provided collection.
   * When `null`, the provided `collection` will not be verified.
   *
   * @defaultValue `null`
   */
  collectionAuthority?: Option<Signer>;

  /**
   * Whether or not the provided `collectionAuthority` is a delegated
   * collection authority, i.e. it was approved by the update authority
   * using `convergence.rfqs().approveCollectionAuthority()`.
   *
   * @defaultValue `false`
   */
  collectionAuthorityIsDelegated?: boolean;

  /**
   * Whether or not the provided `collection` is a sized collection
   * and not a legacy collection.
   *
   * @defaultValue `true`
   */
  collectionIsSized?: boolean;
};

/**
 * @group Operations
 * @category Outputs
 */
export type CreateRfqOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;

  /** The newly created Rfq and its associated token. */
  rfq: RfqWithToken;

  /** The address of the mint account. */
  mintAddress: PublicKey;

  /** The address of the metadata account. */
  metadataAddress: PublicKey;

  /** The address of the master edition account. */
  masterEditionAddress: PublicKey;

  /** The address of the token account. */
  tokenAddress: PublicKey;
};

/**
 * @group Operations
 * @category Handlers
 */
export const createRfqOperationHandler: OperationHandler<CreateRfqOperation> = {
  handle: async (
    operation: CreateRfqOperation,
    convergence: Convergence,
    scope: OperationScope
  ) => {
    const {
      useNewMint = Keypair.generate(),
      useExistingMint,
      tokenOwner = convergence.identity().publicKey,
      tokenAddress: tokenSigner,
    } = operation.input;

    const mintAddress = useExistingMint ?? useNewMint.publicKey;
    const tokenAddress = tokenSigner
      ? toPublicKey(tokenSigner)
      : convergence.tokens().pdas().associatedTokenAccount({
          mint: mintAddress,
          owner: tokenOwner,
          programs: scope.programs,
        });
    const tokenAccount = await convergence.rpc().getAccount(tokenAddress);
    const tokenExists = tokenAccount.exists;

    const builder = await createRfqBuilder(
      convergence,
      {
        ...operation.input,
        useNewMint,
        tokenOwner,
        tokenExists,
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

    const rfq = await convergence.rfqs().findByMint(
      {
        mintAddress: output.mintAddress,
        tokenAddress: output.tokenAddress,
      },
      scope
    );
    scope.throwIfCanceled();

    assertRfqWithToken(rfq);
    return { ...output, rfq };
  },
};

// -----------------
// Builder
// -----------------

/**
 * @group Transaction Builders
 * @category Inputs
 */
export type CreateRfqBuilderParams = Omit<CreateRfqInput, 'confirmOptions'> & {
  /**
   * Whether or not the provided token account already exists.
   * If `false`, we'll add another instruction to create it.
   *
   * @defaultValue `true`
   */
  tokenExists?: boolean;

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

  /** A key to distinguish the instruction that creates the metadata account. */
  createMetadataInstructionKey?: string;

  /** A key to distinguish the instruction that creates the master edition account. */
  createMasterEditionInstructionKey?: string;
};

/**
 * @group Transaction Builders
 * @category Contexts
 */
export type CreateRfqBuilderContext = Omit<CreateRfqOutput, 'response' | 'rfq'>;

/**
 * Creates a new Rfq.
 *
 * ```ts
 * const transactionBuilder = await convergence
 *   .rfqs()
 *   .builders()
 *   .create({
 *     name: 'My Rfq',
 *     uri: 'https://example.com/my-rfq',
 *     sellerFeeBasisPoints: 250, // 2.5%
 *   });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const createRfqBuilder = async (
  convergence: Convergence,
  params: CreateRfqBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<TransactionBuilder<CreateRfqBuilderContext>> => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const {
    updateAuthority = convergence.identity(),
    mintAuthority = convergence.identity(),
  } = params;

  const tokenMetadataProgram = convergence
    .programs()
    .getTokenMetadata(programs);

  const mintAddress = Keypair.generate().publicKey;
  const metadataAddress = Keypair.generate().publicKey;
  const tokenAddress = Keypair.generate().publicKey;

  //const { mintAddress, metadataAddress, tokenAddress } =
  //  sftBuilder.getContext();
  const masterEditionAddress = convergence.rfqs().pdas().masterEdition({
    mint: mintAddress,
    programs,
  });

  return (
    TransactionBuilder.make<CreateRfqBuilderContext>()
      .setFeePayer(payer)
      .setContext({
        mintAddress,
        metadataAddress,
        masterEditionAddress,
        tokenAddress: tokenAddress as PublicKey,
      })

      // Create the mint, the token and the metadata.
      //.add(sftBuilder)

      // Create master edition account (prevents further minting).
      .add({
        instruction: createCreateMasterEditionV3Instruction(
          {
            edition: masterEditionAddress,
            mint: mintAddress,
            updateAuthority: updateAuthority.publicKey,
            mintAuthority: mintAuthority.publicKey,
            payer: payer.publicKey,
            metadata: metadataAddress,
          },
          {
            createMasterEditionArgs: {
              maxSupply: params.maxSupply === undefined ? 0 : params.maxSupply,
            },
          },
          tokenMetadataProgram.address
        ),
        signers: [payer, mintAuthority, updateAuthority],
        key: params.createMasterEditionInstructionKey ?? 'createMasterEdition',
      })
  );
};
