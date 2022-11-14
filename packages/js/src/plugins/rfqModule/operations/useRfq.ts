import { createUtilizeInstruction } from '@metaplex-foundation/mpl-token-metadata';
import { PublicKey } from '@solana/web3.js';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { ExpectedSignerError } from '@/errors';
import { Convergence } from '@/Convergence';
import {
  isSigner,
  Operation,
  OperationHandler,
  OperationScope,
  Signer,
  toPublicKey,
  useOperation,
} from '@/types';
import { TransactionBuilder, TransactionBuilderOptions } from '@/utils';

const Key = 'UseRfqOperation' as const;

/**
 * Utilizes a usable Rfq.
 *
 * ```ts
 * await convergence.rfqs().use({ address });
 * await convergence.rfqs().use({ address, numberOfUses: 3 });
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const useRfqOperation = useOperation<UseRfqOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type UseRfqOperation = Operation<typeof Key, UseRfqInput, UseRfqOutput>;

/**
 * @group Operations
 * @category Inputs
 */
export type UseRfqInput = {
  /** The address of the mint account. */
  mintAddress: PublicKey;

  /**
   * The number of uses to utilize.
   *
   * @defaultValue `1`
   */
  numberOfUses?: number; // Defaults to 1.

  /**
   * The owner of the Rfq.
   *
   * This must be a Signer unless a `useAuthority` is provided.
   *
   * @defaultValue `convergence.identity()`
   */
  owner?: PublicKey | Signer;

  /**
   * The address of the token account linking the mint account
   * with the owner account.
   *
   * @defaultValue Defaults to using the associated token account
   * from the `mintAddress` and `owner` parameters.
   */
  ownerTokenAccount?: PublicKey;

  /**
   * The delegated use authority that should authorize this operation.
   *
   * @defaultValue Defaults to not using a delegated use authority
   * and using the `owner` parameter as a Signer instead.
   */
  useAuthority?: Signer;
};

/**
 * @group Operations
 * @category Outputs
 */
export type UseRfqOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const useRfqOperationHandler: OperationHandler<UseRfqOperation> = {
  handle: async (
    operation: UseRfqOperation,
    convergence: Convergence,
    scope: OperationScope
  ): Promise<UseRfqOutput> => {
    return useRfqBuilder(convergence, operation.input, scope).sendAndConfirm(
      convergence,
      scope.confirmOptions
    );
  },
};

// -----------------
// Builder
// -----------------

/**
 * @group Transaction Builders
 * @category Inputs
 */
export type UseRfqBuilderParams = Omit<UseRfqInput, 'confirmOptions'> & {
  /** A key to distinguish the instruction that uses the Rfq. */
  instructionKey?: string;
};

/**
 * Utilizes a usable Rfq.
 *
 * ```ts
 * const transactionBuilder = convergence
 *   .rfqs()
 *   .builders()
 *   .use({ mintAddress });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const useRfqBuilder = (
  convergence: Convergence,
  params: UseRfqBuilderParams,
  options: TransactionBuilderOptions = {}
): TransactionBuilder => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const {
    mintAddress,
    numberOfUses = 1,
    owner = convergence.identity(),
    useAuthority,
  } = params;

  // Programs.
  const tokenMetadataProgram = convergence
    .programs()
    .getTokenMetadata(programs);

  if (!isSigner(owner) && !useAuthority) {
    throw new ExpectedSignerError('owner', 'PublicKey', {
      problemSuffix:
        'In order to use an Rfq you must either provide the owner as a Signer ' +
        'or a delegated use authority as a Signer.',
    });
  }

  // PDAs.
  const metadata = convergence.rfqs().pdas().metadata({
    mint: mintAddress,
    programs,
  });
  const tokenAccount =
    params.ownerTokenAccount ??
    convergence
      .tokens()
      .pdas()
      .associatedTokenAccount({
        mint: mintAddress,
        owner: toPublicKey(owner),
        programs,
      });
  const useAuthorityRecord = useAuthority
    ? convergence.rfqs().pdas().useAuthorityRecord({
        mint: mintAddress,
        useAuthority: useAuthority.publicKey,
        programs,
      })
    : undefined;
  const programAsBurner = convergence.rfqs().pdas().burner({ programs });

  return (
    TransactionBuilder.make()
      .setFeePayer(payer)

      // Update the metadata account.
      .add({
        instruction: createUtilizeInstruction(
          {
            metadata,
            tokenAccount,
            useAuthority: useAuthority
              ? useAuthority.publicKey
              : toPublicKey(owner),
            mint: mintAddress,
            owner: toPublicKey(owner),
            useAuthorityRecord,
            burner: useAuthorityRecord ? programAsBurner : undefined,
          },
          { utilizeArgs: { numberOfUses } },
          tokenMetadataProgram.address
        ),
        signers: [owner, useAuthority].filter(isSigner),
        key: params.instructionKey ?? 'utilizeRfq',
      })
  );
};
