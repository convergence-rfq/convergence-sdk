import { createApproveInstruction } from '@solana/spl-token';
import { PublicKey } from '@solana/web3.js';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { Convergence } from '@/Convergence';
import {
  isSigner,
  KeypairSigner,
  Operation,
  OperationHandler,
  OperationScope,
  Signer,
  SplTokenAmount,
  token,
  useOperation,
} from '@/types';
import { TransactionBuilder, TransactionBuilderOptions } from '@/utils';

// -----------------
// Operation
// -----------------

const Key = 'ApproveTokenDelegateAuthorityOperation' as const;

/**
 * Approves a delegate authority for a token account.
 *
 * ```ts
 * await convergence
 *   .tokens()
 *   .approveDelegateAuthority({
 *     delegateAuthority,
 *     mintAddress,
 *   };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const approveTokenDelegateAuthorityOperation =
  useOperation<ApproveTokenDelegateAuthorityOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type ApproveTokenDelegateAuthorityOperation = Operation<
  typeof Key,
  ApproveTokenDelegateAuthorityInput,
  ApproveTokenDelegateAuthorityOutput
>;

/**
 * @group Operations
 * @category Inputs
 * */
export type ApproveTokenDelegateAuthorityInput = {
  /** The address of the mint account. */
  mintAddress: PublicKey;

  /** The address of the new delegate authority. */
  delegateAuthority: PublicKey;

  /**
   * The maximum amount of tokens that can be manipulated
   * by the new delegate authority.
   *
   * @defaultValue `token(1)`
   */
  amount?: SplTokenAmount;

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
export type ApproveTokenDelegateAuthorityOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const approveTokenDelegateAuthorityOperationHandler: OperationHandler<ApproveTokenDelegateAuthorityOperation> =
  {
    handle: async (
      operation: ApproveTokenDelegateAuthorityOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<ApproveTokenDelegateAuthorityOutput> => {
      return approveTokenDelegateAuthorityBuilder(
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
export type ApproveTokenDelegateAuthorityBuilderParams = Omit<
  ApproveTokenDelegateAuthorityInput,
  'confirmOptions'
> & {
  /** A key to distinguish the instruction that approves the delegate authority. */
  instructionKey?: string;
};

/**
 * Approves a delegate authority for a token account.
 *
 * ```ts
 * const transactionBuilder = convergence
 *   .tokens()
 *   .builders()
 *   .approveDelegateAuthority({
 *     delegateAuthority,
 *     mintAddress,
 *   });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const approveTokenDelegateAuthorityBuilder = (
  convergence: Convergence,
  params: ApproveTokenDelegateAuthorityBuilderParams,
  options: TransactionBuilderOptions = {}
): TransactionBuilder => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const {
    mintAddress,
    delegateAuthority,
    amount = token(1),
    owner = convergence.identity(),
    tokenAddress,
    multiSigners = [],
  } = params;

  const [ownerPublicKey, signers] = isSigner(owner)
    ? [owner.publicKey, [owner]]
    : [owner, multiSigners];

  const tokenProgram = convergence.programs().getToken(programs);
  const tokenAddressOrAta =
    tokenAddress ??
    convergence.tokens().pdas().associatedTokenAccount({
      mint: mintAddress,
      owner: ownerPublicKey,
      programs,
    });

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .add({
      instruction: createApproveInstruction(
        tokenAddressOrAta,
        delegateAuthority,
        ownerPublicKey,
        amount.basisPoints.toNumber(),
        multiSigners,
        tokenProgram.address
      ),
      signers,
      key: params.instructionKey ?? 'approveDelegateAuthority',
    });
};
