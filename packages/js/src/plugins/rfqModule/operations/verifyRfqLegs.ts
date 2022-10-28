import {
  createVerifyCollectionInstruction,
  createVerifySizedCollectionItemInstruction,
} from '@metaplex-foundation/mpl-token-metadata';
import { PublicKey } from '@solana/web3.js';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { Convergence } from '@/Convergence';
import {
  Operation,
  OperationHandler,
  OperationScope,
  Signer,
  useOperation,
} from '@/types';
import { TransactionBuilder, TransactionBuilderOptions } from '@/utils';

// -----------------
// Operation
// -----------------

const Key = 'VerifyRfqLegsOperation' as const;

/**
 * Verifies the legs of an RFQ.
 *
 * ```ts
 * await convergence
 *   .rfqs()
 *   .verifyCollection({ mintAddress, collectionMintAddress };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const verifyRfqLegsOperation = useOperation<VerifyRfqLegsOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type VerifyRfqLegsOperation = Operation<
  typeof Key,
  VerifyRfqLegsInput,
  VerifyRfqLegsOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type VerifyRfqLegsInput = {
  /** The address of the mint account. */
  mintAddress: PublicKey;

  /** The mint address of the collection NFT. */
  collectionMintAddress: PublicKey;

  /**
   * An authority that can verify and unverify collection items
   * from the provided `collectionMintAddress`.
   *
   * @defaultValue `convergence.identity()`
   */
  collectionAuthority?: Signer;

  /**
   * Whether or not the provided `collectionMintAddress` is a
   * sized collection (as opposed to a legacy collection).
   *
   * @defaultValue `true`
   */
  isSizedCollection?: boolean;

  /**
   * Whether or not the provided `collectionAuthority` is a delegated
   * collection authority, i.e. it was approved by the update authority
   * using `convergence.rfqs().approveCollectionAuthority()`.
   *
   * @defaultValue `false`
   */
  isDelegated?: boolean;
};

/**
 * @group Operations
 * @category Outputs
 */
export type VerifyRfqLegsOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const verifyRfqLegsOperationHandler: OperationHandler<VerifyRfqLegsOperation> =
  {
    handle: async (
      operation: VerifyRfqLegsOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<VerifyRfqLegsOutput> => {
      return verifyRfqLegsBuilder(
        convergence,
        operation.input,
        scope
      ).sendAndConfirm(convergence, scope.confirmOptions);
    },
  };

// -----------------
// Builder
// -----------------

/**
 * @group Transaction Builders
 * @category Inputs
 */
export type VerifyRfqLegsBuilderParams = Omit<
  VerifyRfqLegsInput,
  'confirmOptions'
> & {
  /** A key to distinguish the instruction that verifies the collection. */
  instructionKey?: string;
};

/**
 * Verifies the collection of an NFT or SFT.
 *
 * ```ts
 * const transactionBuilder = convergence
 *   .rfqs()
 *   .builders()
 *   .verifyCollection({ mintAddress, collectionMintAddress });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const verifyRfqLegsBuilder = (
  convergence: Convergence,
  params: VerifyRfqLegsBuilderParams,
  options: TransactionBuilderOptions = {}
): TransactionBuilder => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const {
    mintAddress,
    collectionMintAddress,
    isSizedCollection = true,
    isDelegated = false,
    collectionAuthority = convergence.identity(),
  } = params;

  // Programs.
  const tokenMetadataProgram = convergence
    .programs()
    .getTokenMetadata(programs);

  const accounts = {
    metadata: convergence.rfqs().pdas().metadata({
      mint: mintAddress,
      programs,
    }),
    collectionAuthority: collectionAuthority.publicKey,
    payer: payer.publicKey,
    collectionMint: collectionMintAddress,
    collection: convergence.rfqs().pdas().metadata({
      mint: collectionMintAddress,
      programs,
    }),
    collectionMasterEditionAccount: convergence.rfqs().pdas().masterEdition({
      mint: collectionMintAddress,
      programs,
    }),
  };

  const instruction = isSizedCollection
    ? createVerifySizedCollectionItemInstruction(
        accounts,
        tokenMetadataProgram.address
      )
    : createVerifyCollectionInstruction(accounts, tokenMetadataProgram.address);

  if (isDelegated) {
    instruction.keys.push({
      pubkey: convergence.rfqs().pdas().collectionAuthorityRecord({
        mint: collectionMintAddress,
        collectionAuthority: collectionAuthority.publicKey,
        programs,
      }),
      isWritable: false,
      isSigner: false,
    });
  }

  return (
    TransactionBuilder.make()
      .setFeePayer(payer)

      // Verify the collection.
      .add({
        instruction,
        signers: [payer, collectionAuthority],
        key: params.instructionKey ?? 'verifyCollection',
      })
  );
};
