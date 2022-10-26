import { createThawDelegatedAccountInstruction } from '@metaplex-foundation/mpl-token-metadata';
import { PublicKey } from '@solana/web3.js';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import type { Convergence } from '@/Convergence';
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

const Key = 'ThawDelegatedNftOperation' as const;

/**
 * Thaws a NFT via its delegate authority.
 *
 * ```ts
 * await convergence
 *   .rfqs()
 *   .thawDelegatedNft({ mintAddress, delegateAuthority };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const thawDelegatedNftOperation =
  useOperation<ThawDelegatedNftOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type ThawDelegatedNftOperation = Operation<
  typeof Key,
  ThawDelegatedNftInput,
  ThawDelegatedNftOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type ThawDelegatedNftInput = {
  /** The address of the mint account. */
  mintAddress: PublicKey;

  /**
   * The SPL Token delegate authority.
   *
   * This authority should have been approved using
   * `convergence.tokens().approveDelegateAuthority()` beforehand.
   */
  delegateAuthority: Signer;

  /**
   * The owner of the token account.
   *
   * @defaultValue `convergence.identity().publicKey`
   */
  tokenOwner?: PublicKey;

  /**
   * The address of the token account.
   *
   * @defaultValue Defaults to using the associated token account
   * from the `mintAddress` and `tokenOwner` parameters.
   */
  tokenAddress?: PublicKey;
};

/**
 * @group Operations
 * @category Outputs
 */
export type ThawDelegatedNftOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const thawDelegatedNftOperationHandler: OperationHandler<ThawDelegatedNftOperation> =
  {
    async handle(
      operation: ThawDelegatedNftOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<ThawDelegatedNftOutput> {
      return thawDelegatedNftBuilder(
        convergence,
        operation.input
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
export type ThawDelegatedNftBuilderParams = Omit<
  ThawDelegatedNftInput,
  'confirmOptions'
> & {
  /** A key to distinguish the instruction that thaws the NFT. */
  instructionKey?: string;
};

/**
 * Thaws a NFT via its delegate authority.
 *
 * ```ts
 * const transactionBuilder = convergence
 *   .rfqs()
 *   .builders()
 *   .thawDelegatedNft({ mintAddress, delegateAuthority });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const thawDelegatedNftBuilder = (
  convergence: Convergence,
  params: ThawDelegatedNftBuilderParams,
  options: TransactionBuilderOptions = {}
): TransactionBuilder => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const {
    mintAddress,
    delegateAuthority,
    tokenOwner = convergence.identity().publicKey,
    tokenAddress,
  } = params;

  // Programs.
  const tokenProgram = convergence.programs().getToken(programs);
  const tokenMetadataProgram = convergence
    .programs()
    .getTokenMetadata(programs);

  const editionAddress = convergence.rfqs().pdas().masterEdition({
    mint: mintAddress,
    programs,
  });
  const tokenAddressOrAta =
    tokenAddress ??
    convergence.tokens().pdas().associatedTokenAccount({
      mint: mintAddress,
      owner: tokenOwner,
      programs,
    });

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .add({
      instruction: createThawDelegatedAccountInstruction(
        {
          delegate: delegateAuthority.publicKey,
          tokenAccount: tokenAddressOrAta,
          edition: editionAddress,
          mint: mintAddress,
          tokenProgram: tokenProgram.address,
        },
        tokenMetadataProgram.address
      ),
      signers: [delegateAuthority],
      key: params.instructionKey ?? 'thawDelegatedNft',
    });
};
