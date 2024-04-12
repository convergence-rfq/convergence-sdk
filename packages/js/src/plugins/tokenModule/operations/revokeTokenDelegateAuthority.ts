import { createRevokeInstruction } from '@solana/spl-token';
import { PublicKey } from '@solana/web3.js';

import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { Convergence } from '../../../Convergence';
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

const Key = 'RevokeTokenDelegateAuthorityOperation' as const;

/**
 * Revokes the current delegate authority for a token account.
 *
 * ```ts
 * await convergence
 *   .tokens()
 *   .revokeDelegateAuthority({ mintAddress };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const revokeTokenDelegateAuthorityOperation =
  useOperation<RevokeTokenDelegateAuthorityOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type RevokeTokenDelegateAuthorityOperation = Operation<
  typeof Key,
  RevokeTokenDelegateAuthorityInput,
  RevokeTokenDelegateAuthorityOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type RevokeTokenDelegateAuthorityInput = {
  mintAddress: PublicKey;

  /**
   * The owner of the token account as a Signer.
   *
   * This may be provided as a PublicKey if and only if
   * the `multiSigners` parameter is provided.
   *
   * @defaultValue `convergence.identity()`
   */
  owner?: Signer | PublicKey;

  /**
   * The address of the token account.
   *
   * @defaultValue Defaults to using the associated token account
   * from the `mintAddress` and `owner` parameters.
   */
  tokenAddress?: PublicKey;

  /**
   * The signing accounts to use if the token owner is a multisig.
   *
   * @defaultValue `[]`
   */
  multiSigners?: KeypairSigner[];
};

/**
 * @group Operations
 * @category Outputs
 */
export type RevokeTokenDelegateAuthorityOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const revokeTokenDelegateAuthorityOperationHandler: OperationHandler<RevokeTokenDelegateAuthorityOperation> =
  {
    handle: async (
      operation: RevokeTokenDelegateAuthorityOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<RevokeTokenDelegateAuthorityOutput> => {
      return revokeTokenDelegateAuthorityBuilder(
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
export type RevokeTokenDelegateAuthorityBuilderParams = Omit<
  RevokeTokenDelegateAuthorityInput,
  'confirmOptions'
> & {
  /** A key to distinguish the instruction that revokes the delegated authority. */
  instructionKey?: string;
};

/**
 * Revokes the current delegate authority for a token account.
 *
 * ```ts
 * await convergence
 *   .tokens()
 *   .builders()
 *   .revokeDelegateAuthority({ mintAddress });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const revokeTokenDelegateAuthorityBuilder = (
  convergence: Convergence,
  params: RevokeTokenDelegateAuthorityBuilderParams,
  options: TransactionBuilderOptions = {}
): TransactionBuilder => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const {
    mintAddress,
    owner = convergence.identity(),
    tokenAddress,
    multiSigners = [],
  } = params;

  const [ownerPublicKey, signers] = isSigner(owner)
    ? [owner.publicKey, [owner]]
    : [owner, multiSigners];

  const tokenProgram = convergence.programs().getToken(programs);
  const tokenAccount =
    tokenAddress ??
    convergence.tokens().pdas().associatedTokenAccount({
      mint: mintAddress,
      owner: ownerPublicKey,
      programs,
    });

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .addTxPriorityFeeIx(convergence)
    .add({
      instruction: createRevokeInstruction(
        tokenAccount,
        ownerPublicKey,
        multiSigners,
        tokenProgram.address
      ),
      signers,
      key: params.instructionKey ?? 'revokeDelegateAuthority',
    });
};
