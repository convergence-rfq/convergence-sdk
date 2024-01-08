import {
  ComputeBudgetProgram,
  PublicKey,
  SystemProgram,
} from '@solana/web3.js';

import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import type { Convergence } from '../../../Convergence';
import {
  assertSol,
  Operation,
  OperationHandler,
  OperationScope,
  Signer,
  SolAmount,
  useOperation,
} from '../../../types';
import {
  TransactionBuilder,
  TransactionBuilderOptions,
} from '../../../utils/TransactionBuilder';
import { TRANSACTION_PRIORITY_FEE_MAP } from '@/constants';

const Key = 'TransferSolOperation' as const;

/**
 * Transfers some SOL from one account to another.
 *
 * ```ts
 * await convergence
 *   .system()
 *   .transferSol({
 *     to: new PublicKey("..."),
 *     amount: sol(1.5),
 *   };
 * ````
 *
 * @group Operations
 * @category Constructors
 */
export const transferSolOperation = useOperation<TransferSolOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type TransferSolOperation = Operation<
  typeof Key,
  TransferSolInput,
  TransferSolOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type TransferSolInput = {
  /**
   * Optional account that sends the SOLs as a Signer.
   *
   * @defaultValue `convergence.identity()`
   */
  from?: Signer;

  /** The pubkey address of the account that receives the SOL. */
  to: PublicKey;

  /** The amount of SOL to send. */
  amount: SolAmount;

  /**
   * Base public key to use to derive the funding account address.
   *
   * @defaultValue Defaults to not being used.
   */
  basePubkey?: PublicKey;

  /**
   * Seed to use to derive the funding account address.
   *
   * @defaultValue Defaults to not being used.
   */
  seed?: string;
};

/**
 * @group Operations
 * @category Outputs
 */
export type TransferSolOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const transferSolOperationHandler: OperationHandler<TransferSolOperation> =
  {
    async handle(
      operation: TransferSolOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<TransferSolOutput> {
      const builder = transferSolBuilder(convergence, operation.input, scope);
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
export type TransferSolBuilderParams = Omit<
  TransferSolInput,
  'confirmOptions'
> & {
  /** A key to distinguish the instruction that transfers some SOL. */
  instructionKey?: string;
};

/**
 * Transfers some SOL from one account to another.
 *
 * ```ts
 * const transactionBuilder = convergence
 *   .system()
 *   .builders()
 *   .transferSol({
 *     to: new PublicKey("..."),
 *     amount: sol(1.5),
 *   });
 * ````
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const transferSolBuilder = (
  convergence: Convergence,
  params: TransferSolBuilderParams,
  options: TransactionBuilderOptions = {}
): TransactionBuilder => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const {
    from = convergence.identity(),
    to,
    amount,
    basePubkey,
    seed,
  } = params;

  assertSol(amount);

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .add(
      {
        instruction: ComputeBudgetProgram.setComputeUnitPrice({
          microLamports:
            TRANSACTION_PRIORITY_FEE_MAP[convergence.transactionPriority] ??
            TRANSACTION_PRIORITY_FEE_MAP['none'],
        }),
        signers: [],
      },
      {
        instruction: SystemProgram.transfer({
          fromPubkey: from.publicKey,
          toPubkey: to,
          lamports: amount.basisPoints.toNumber(),
          ...(basePubkey ? { basePubkey, seed } : {}),
          programId: convergence.programs().getSystem(programs).address,
        }),
        signers: [from],
        key: params.instructionKey ?? 'transferSol',
      }
    );
};
