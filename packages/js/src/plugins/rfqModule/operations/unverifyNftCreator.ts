import { createRemoveCreatorVerificationInstruction } from '@metaplex-foundation/mpl-token-metadata';
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

const Key = 'UnverifyNftCreatorOperation' as const;

/**
 * Unverifies the creator of an NFT or SFT.
 *
 * ```ts
 * await convergence
 *   .rfqs()
 *   .unverifyCreator({ mintAddress, creator };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const unverifyNftCreatorOperation =
  useOperation<UnverifyNftCreatorOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type UnverifyNftCreatorOperation = Operation<
  typeof Key,
  UnverifyNftCreatorInput,
  UnverifyNftCreatorOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type UnverifyNftCreatorInput = {
  /** The address of the mint account. */
  mintAddress: PublicKey;

  /**
   * The creator of the NFT or SFT as a Signer.
   *
   * @defaultValue `convergence.identity()`
   */
  creator?: Signer;
};

/**
 * @group Operations
 * @category Outputs
 */
export type UnverifyNftCreatorOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const unverifyNftCreatorOperationHandler: OperationHandler<UnverifyNftCreatorOperation> =
  {
    handle: async (
      operation: UnverifyNftCreatorOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<UnverifyNftCreatorOutput> => {
      return unverifyNftCreatorBuilder(
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
export type UnverifyNftCreatorBuilderParams = Omit<
  UnverifyNftCreatorInput,
  'confirmOptions'
> & {
  /** A key to distinguish the instruction that unverifies the creator. */
  instructionKey?: string;
};

/**
 * Unverifies the creator of an NFT or SFT.
 *
 * ```ts
 * const transactionBuilder = convergence
 *   .rfqs()
 *   .builders()
 *   .unverifyCreator({ mintAddress, creator });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const unverifyNftCreatorBuilder = (
  convergence: Convergence,
  params: UnverifyNftCreatorBuilderParams,
  options: TransactionBuilderOptions = {}
): TransactionBuilder => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const { mintAddress, creator = convergence.identity() } = params;

  // Programs.
  const tokenMetadataProgram = convergence
    .programs()
    .getTokenMetadata(programs);

  return (
    TransactionBuilder.make()
      .setFeePayer(payer)

      // Verify the creator.
      .add({
        instruction: createRemoveCreatorVerificationInstruction(
          {
            metadata: convergence.rfqs().pdas().metadata({
              mint: mintAddress,
              programs,
            }),
            creator: creator.publicKey,
          },
          tokenMetadataProgram.address
        ),
        signers: [creator],
        key: params.instructionKey ?? 'unverifyCreator',
      })
  );
};
