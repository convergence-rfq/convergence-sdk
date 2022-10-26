import { createApproveCollectionAuthorityInstruction } from '@metaplex-foundation/mpl-token-metadata';
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

const Key = 'ApproveNftCollectionAuthorityOperation' as const;

/**
 * Approves a new collection authority.
 *
 * ```ts
 * await convergence
 *   .rfqs()
 *   .approveCollectionAuthority({
 *     mintAddress,
 *     collectionAuthority,
 *   };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const approveNftCollectionAuthorityOperation =
  useOperation<ApproveNftCollectionAuthorityOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type ApproveNftCollectionAuthorityOperation = Operation<
  typeof Key,
  ApproveNftCollectionAuthorityInput,
  ApproveNftCollectionAuthorityOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type ApproveNftCollectionAuthorityInput = {
  /** The address of the mint account. */
  mintAddress: PublicKey;

  /** The address of the collection authority to approve. */
  collectionAuthority: PublicKey;

  /**
   * The update authority of the NFT or SFT as a Signer.
   *
   * @defaultValue `convergence.identity()`
   */
  updateAuthority?: Signer;
};

/**
 * @group Operations
 * @category Outputs
 */
export type ApproveNftCollectionAuthorityOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const approveNftCollectionAuthorityOperationHandler: OperationHandler<ApproveNftCollectionAuthorityOperation> =
  {
    handle: async (
      operation: ApproveNftCollectionAuthorityOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<ApproveNftCollectionAuthorityOutput> => {
      return approveNftCollectionAuthorityBuilder(
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
export type ApproveNftCollectionAuthorityBuilderParams = Omit<
  ApproveNftCollectionAuthorityInput,
  'confirmOptions'
> & {
  /** A key to distinguish the instruction that approves the collection authority. */
  instructionKey?: string;
};

/**
 * Approves a new collection authority.
 *
 * ```ts
 * const transactionBuilder = convergence
 *   .rfqs()
 *   .builders()
 *   .approveCollectionAuthority({
 *     mintAddress,
 *     collectionAuthority,
 *   });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const approveNftCollectionAuthorityBuilder = (
  convergence: Convergence,
  params: ApproveNftCollectionAuthorityBuilderParams,
  options: TransactionBuilderOptions = {}
): TransactionBuilder => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const {
    mintAddress,
    collectionAuthority,
    updateAuthority = convergence.identity(),
  } = params;

  // Programs.
  const systemProgram = convergence.programs().getSystem(programs);
  const tokenMetadataProgram = convergence
    .programs()
    .getTokenMetadata(programs);

  // PDAs.
  const metadata = convergence.rfqs().pdas().metadata({
    mint: mintAddress,
    programs,
  });
  const collectionAuthorityRecord = convergence
    .rfqs()
    .pdas()
    .collectionAuthorityRecord({
      mint: mintAddress,
      collectionAuthority,
      programs,
    });

  return (
    TransactionBuilder.make()
      .setFeePayer(payer)

      // Approve the collection authority.
      .add({
        instruction: createApproveCollectionAuthorityInstruction(
          {
            collectionAuthorityRecord,
            newCollectionAuthority: collectionAuthority,
            updateAuthority: updateAuthority.publicKey,
            payer: payer.publicKey,
            metadata,
            mint: mintAddress,
            systemProgram: systemProgram.address,
          },
          tokenMetadataProgram.address
        ),
        signers: [payer, updateAuthority],
        key: params.instructionKey ?? 'approveCollectionAuthority',
      })
  );
};
