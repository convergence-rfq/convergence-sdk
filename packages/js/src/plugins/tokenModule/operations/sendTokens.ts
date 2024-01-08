import { createTransferInstruction } from '@solana/spl-token';
import { ComputeBudgetProgram, PublicKey } from '@solana/web3.js';

import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import type { Convergence } from '../../../Convergence';
import {
  isSigner,
  KeypairSigner,
  Operation,
  OperationHandler,
  OperationScope,
  Signer,
  SplTokenAmount,
  toPublicKey,
  useOperation,
} from '../../../types';
import {
  TransactionBuilder,
  TransactionBuilderOptions,
} from '../../../utils/TransactionBuilder';
import { TRANSACTION_PRIORITY_FEE_MAP } from '@/constants';

const Key = 'SendTokensOperation' as const;

/**
 * Send tokens from one account to another.
 *
 * ```ts
 * await convergence
 *   .tokens()
 *   .send({
 *     mintAddress,
 *     toOwner,
 *     amount: token(100),
 *   };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const sendTokensOperation = useOperation<SendTokensOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type SendTokensOperation = Operation<
  typeof Key,
  SendTokensInput,
  SendTokensOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type SendTokensInput = {
  /** The address of the mint account. */
  mintAddress: PublicKey;

  /** The amount of tokens to send. */
  amount: SplTokenAmount;

  /**
   * The owner of the destination token account.
   *
   * @defaultValue `convergence.identity().publicKey`
   */
  toOwner?: PublicKey;

  /**
   * The address of the destination token account.
   *
   * Note that this may be required as a `Signer` if the destination
   * token account does not exist and we need to create it before
   * sending the tokens.
   *
   * @defaultValue Defaults to using the associated token account
   * from the `mintAddress` and `toOwner` parameters.
   */
  toToken?: PublicKey | Signer;

  /**
   * The owner of the source token account.
   *
   * This may be provided as a PublicKey if one of the following is true:
   * - the owner of the source token account is a multisig and the
   *   `fromMultiSigners` parameter is provided.
   * - we are using a delegate authority to send the tokens and the
   *   `delegateAuthority` parameter is provided.
   *
   * @defaultValue `convergence.identity()`
   */
  fromOwner?: PublicKey | Signer; // Defaults to mx.identity().

  /**
   * The address of the source token account.
   *
   * @defaultValue Defaults to using the associated token account
   * from the `mintAddress` and `fromOwner` parameters.
   */
  fromToken?: PublicKey;

  /**
   * The signing accounts to use if the source token owner is a multisig.
   *
   * @defaultValue `[]`
   */
  fromMultiSigners?: KeypairSigner[];

  /**
   * The delegate authority of the source token account as a Signer.
   *
   * This is required when the owner of the source token account
   * is provided as a PublicKey as someone needs to authorize
   * that transfer of tokens.
   *
   * @defaultValue Defaults to not using a delegate authority.
   */
  delegateAuthority?: Signer;
};

/**
 * @group Operations
 * @category Outputs
 */
export type SendTokensOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const sendTokensOperationHandler: OperationHandler<SendTokensOperation> =
  {
    async handle(
      operation: SendTokensOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<SendTokensOutput> {
      const {
        mintAddress,
        toOwner = convergence.identity().publicKey,
        toToken,
      } = operation.input;

      const destination =
        toToken ??
        convergence.tokens().pdas().associatedTokenAccount({
          mint: mintAddress,
          owner: toOwner,
          programs: scope.programs,
        });
      const destinationAddress = toPublicKey(destination);
      const destinationAccountExists = await convergence
        .rpc()
        .accountExists(destinationAddress);
      scope.throwIfCanceled();

      const builder = await sendTokensBuilder(
        convergence,
        { ...operation.input, toTokenExists: destinationAccountExists },
        scope
      );
      scope.throwIfCanceled();

      return builder.sendAndConfirm(convergence, scope.confirmOptions);
    },
  };

// -----------------
// Builder
// -----------------

/**
 * @group Transaction Builders
 * @category Inputs
 */
export type SendTokensBuilderParams = Omit<
  SendTokensInput,
  'confirmOptions'
> & {
  /**
   * Whether or not the receiving token account already exists.
   * If `false`, we'll add another instruction to create it.
   *
   * @defaultValue `true`
   */
  toTokenExists?: boolean;

  /** A key to distinguish the instruction that creates the associated token account. */
  createAssociatedTokenAccountInstructionKey?: string;

  /** A key to distinguish the instruction that creates the token account. */
  createAccountInstructionKey?: string;

  /** A key to distinguish the instruction that initializes the token account. */
  initializeTokenInstructionKey?: string;

  /** A key to distinguish the instruction that transfers the tokens. */
  transferTokensInstructionKey?: string;
};

/**
 * Send tokens from one account to another.
 *
 * ```ts
 * const transactionBuilder = await convergence
 *   .tokens()
 *   .builders()
 *   .send({
 *     mintAddress,
 *     toOwner,
 *     amount: token(100),
 *   });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const sendTokensBuilder = async (
  convergence: Convergence,
  params: SendTokensBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<TransactionBuilder> => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const {
    mintAddress,
    amount,
    toOwner = convergence.identity().publicKey,
    toToken,
    toTokenExists = true,
    fromOwner = convergence.identity(),
    fromToken,
    fromMultiSigners = [],
    delegateAuthority,
  } = params;

  const [fromOwnerPublicKey, signers] = isSigner(fromOwner)
    ? [fromOwner.publicKey, [fromOwner]]
    : [fromOwner, [delegateAuthority, ...fromMultiSigners].filter(isSigner)];

  const tokenProgram = convergence.programs().getToken(programs);
  const source =
    fromToken ??
    convergence.tokens().pdas().associatedTokenAccount({
      mint: mintAddress,
      owner: fromOwnerPublicKey,
      programs,
    });
  const destination =
    toToken ??
    convergence.tokens().pdas().associatedTokenAccount({
      mint: mintAddress,
      owner: toOwner,
      programs,
    });

  return (
    TransactionBuilder.make()
      .setFeePayer(payer)
      .add({
        instruction: ComputeBudgetProgram.setComputeUnitPrice({
          microLamports:
            TRANSACTION_PRIORITY_FEE_MAP[convergence.transactionPriority] ??
            TRANSACTION_PRIORITY_FEE_MAP['none'],
        }),
        signers: [],
      })

      // Create token account if missing.
      .add(
        await convergence
          .tokens()
          .builders()
          .createTokenIfMissing(
            {
              ...params,
              mint: mintAddress,
              owner: toOwner,
              token: toToken,
              tokenExists: toTokenExists,
              tokenVariable: 'toToken',
            },
            { programs, payer }
          )
      )

      // Transfer tokens.
      .add({
        instruction: createTransferInstruction(
          source,
          toPublicKey(destination),
          delegateAuthority ? delegateAuthority.publicKey : fromOwnerPublicKey,
          amount.basisPoints.toNumber(),
          fromMultiSigners,
          tokenProgram.address
        ),
        signers,
        key: params.transferTokensInstructionKey ?? 'transferTokens',
      })
  );
};
