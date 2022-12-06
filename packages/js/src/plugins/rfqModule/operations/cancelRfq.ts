import { createCancelRfqInstruction } from '@convergence-rfq/rfq';
import { PublicKey } from '@solana/web3.js';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { Convergence } from '@/Convergence';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
  Signer,
} from '@/types';
import { TransactionBuilder, TransactionBuilderOptions } from '@/utils';

const Key = 'CancelRfqOperation' as const;

/**
 * Cancels an existing Rfq.
 *
 * ```ts
 * await convergence
 *   .rfqs()
 *   .cancel({ address };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const cancelRfqOperation = useOperation<CancelRfqOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type CancelRfqOperation = Operation<
  typeof Key,
  CancelRfqInput,
  CancelRfqOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type CancelRfqInput = {
  /**
   * The Taker of the Rfq as a Signer.
   *
   * @defaultValue `convergence.identity()`
   */
  taker?: Signer;

  /** The address of the protocol account */
  protocol: PublicKey;

  /** The address of the Rfq account. */
  rfq: PublicKey;
};

/**
 * @group Operations
 * @category Outputs
 */
export type CancelRfqOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const cancelRfqOperationHandler: OperationHandler<CancelRfqOperation> = {
  handle: async (
    operation: CancelRfqOperation,
    convergence: Convergence,
    scope: OperationScope
  ): Promise<CancelRfqOutput> => {
    scope.throwIfCanceled();

    return cancelRfqBuilder(convergence, operation.input, scope).sendAndConfirm(
      convergence,
      scope.confirmOptions
    );
  },
};

/**
 * @group Transaction Builders
 * @category Inputs
 */
export type CancelRfqBuilderParams = CancelRfqInput;

/**
 * Cancels an existing Rfq.
 *
 * ```ts
 * const transactionBuilder = convergence
 *   .rfqs()
 *   .builders()
 *   .cancel({ address });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const cancelRfqBuilder = (
  convergence: Convergence,
  params: CancelRfqBuilderParams,
  options: TransactionBuilderOptions = {}
): TransactionBuilder => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const { taker = convergence.identity(), protocol, rfq } = params;

  const rfqProgram = convergence.programs().getRfq(programs);

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .add({
      instruction: createCancelRfqInstruction(
        {
          taker: taker.publicKey,
          protocol,
          rfq,
        },
        rfqProgram.address
      ),
      signers: [taker],
      key: 'cancelRfq',
    });
};
