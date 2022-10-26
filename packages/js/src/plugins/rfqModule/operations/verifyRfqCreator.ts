import { createSignMetadataInstruction } from '@metaplex-foundation/mpl-token-metadata';
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

const Key = 'VerifyRfqCreatorOperation' as const;

/**
 * Verifies the creator of an Rfq or SFT.
 *
 * ```ts
 * await convergence
 *   .rfqs()
 *   .verifyCreator({ mintAddress, creator };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const verifyRfqCreatorOperation =
  useOperation<VerifyRfqCreatorOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type VerifyRfqCreatorOperation = Operation<
  typeof Key,
  VerifyRfqCreatorInput,
  VerifyRfqCreatorOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type VerifyRfqCreatorInput = {
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
export type VerifyRfqCreatorOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const verifyRfqCreatorOperationHandler: OperationHandler<VerifyRfqCreatorOperation> =
  {
    handle: async (
      operation: VerifyRfqCreatorOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<VerifyRfqCreatorOutput> => {
      return verifyRfqCreatorBuilder(
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
export type VerifyRfqCreatorBuilderParams = Omit<
  VerifyRfqCreatorInput,
  'confirmOptions'
> & {
  /** A key to distinguish the instruction that verifies the creator. */
  instructionKey?: string;
};

/**
 * Verifies the creator of an NFT or SFT.
 *
 * ```ts
 * const transactionBuilder = convergence
 *   .rfqs()
 *   .builders()
 *   .verifyCreator({ mintAddress, creator });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const verifyRfqCreatorBuilder = (
  convergence: Convergence,
  params: VerifyRfqCreatorBuilderParams,
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
        instruction: createSignMetadataInstruction(
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
        key: params.instructionKey ?? 'verifyCreator',
      })
  );
};
