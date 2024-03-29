import { createFreezeAccountInstruction } from '@solana/spl-token';
import { PublicKey } from '@solana/web3.js';

import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import type { Convergence } from '../../../Convergence';
import {
  isSigner,
  KeypairSigner,
  Operation,
  OperationHandler,
  OperationScope,
  Signer,
  useOperation,
} from '../../../types';
import {
  TransactionBuilder,
  TransactionBuilderOptions,
} from '../../../utils/TransactionBuilder';

const Key = 'FreezeTokensOperation' as const;

/**
 * Freezes a token account.
 *
 * ```ts
 * await convergence.tokens().freeze({ mintAddress, freezeAuthority });
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const freezeTokensOperation = useOperation<FreezeTokensOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type FreezeTokensOperation = Operation<
  typeof Key,
  FreezeTokensInput,
  FreezeTokensOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type FreezeTokensInput = {
  /** The address of the mint account. */
  mintAddress: PublicKey;

  /**
   * The freeze authority as a Signer.
   *
   * This may be provided as a PublicKey if and only if
   * the `multiSigners` parameter is provided.
   */
  freezeAuthority: PublicKey | Signer;

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

  /**
   * The signing accounts to use if the freeze authority is a multisig.
   *
   * @defaultValue `[]`
   */
  multiSigners?: KeypairSigner[];
};

/**
 * @group Operations
 * @category Outputs
 */
export type FreezeTokensOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const freezeTokensOperationHandler: OperationHandler<FreezeTokensOperation> =
  {
    async handle(
      operation: FreezeTokensOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<FreezeTokensOutput> {
      return freezeTokensBuilder(
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
export type FreezeTokensBuilderParams = Omit<
  FreezeTokensInput,
  'confirmOptions'
> & {
  /** A key to distinguish the instruction that freezes the token account. */
  instructionKey?: string;
};

/**
 * Freezes a token account.
 *
 * ```ts
 * const transactionBuilder = convergence.tokens().builders().freeze({ mintAddress, freezeAuthority });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const freezeTokensBuilder = (
  convergence: Convergence,
  params: FreezeTokensBuilderParams,
  options: TransactionBuilderOptions = {}
): TransactionBuilder => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const {
    mintAddress,
    tokenOwner = convergence.identity().publicKey,
    tokenAddress,
    multiSigners = [],
    freezeAuthority,
  } = params;

  const [authorityPublicKey, signers] = isSigner(freezeAuthority)
    ? [freezeAuthority.publicKey, [freezeAuthority]]
    : [freezeAuthority, multiSigners];

  const tokenProgram = convergence.programs().getToken(programs);
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
      instruction: createFreezeAccountInstruction(
        tokenAddressOrAta,
        mintAddress,
        authorityPublicKey,
        multiSigners,
        tokenProgram.address
      ),
      signers,
      key: params.instructionKey ?? 'freezeTokens',
    });
};
