import { createSettleInstruction } from '@convergence-rfq/rfq';
import { PublicKey } from '@solana/web3.js';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { Convergence } from '@/Convergence';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '@/types';
import { TransactionBuilder, TransactionBuilderOptions } from '@/utils';

const Key = 'SettleOperation' as const;

/**
 * Settles.
 *
 * ```ts
 * await convergence
 *   .rfqs()
 *   .settle({ address };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const settleOperation = useOperation<SettleOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type SettleOperation = Operation<typeof Key, SettleInput, SettleOutput>;

/**
 * @group Operations
 * @category Inputs
 */
export type SettleInput = {
  /** The address of the protocol account. */
  protocol: PublicKey;
  /** The address of the Rfq account. */
  rfq: PublicKey;
  /** The address of the Response account. */
  response: PublicKey;
  /** The address of the Token account for the quote receiver tokens */
  quoteReceiverTokens: PublicKey;
  /** The address of the quote escrow account */
  quoteEscrow: PublicKey;
};

/**
 * @group Operations
 * @category Outputs
 */
export type SettleOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const settleOperationHandler: OperationHandler<SettleOperation> = {
  handle: async (
    operation: SettleOperation,
    convergence: Convergence,
    scope: OperationScope
  ): Promise<SettleOutput> => {
    scope.throwIfCanceled();

    return settleBuilder(convergence, operation.input, scope).sendAndConfirm(
      convergence,
      scope.confirmOptions
    );
  },
};

/**
 * @group Transaction Builders
 * @category Inputs
 */
export type SettleBuilderParams = SettleInput;

/**
 * Settles
 *
 * ```ts
 * const transactionBuilder = convergence
 *   .rfqs()
 *   .builders()
 *   .settle({ address });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const settleBuilder = (
  convergence: Convergence,
  params: SettleBuilderParams,
  options: TransactionBuilderOptions = {}
): TransactionBuilder => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const { protocol, rfq, response, quoteReceiverTokens, quoteEscrow } = params;

  const rfqProgram = convergence.programs().getRfq(programs);
  const tokenProgram = convergence.programs().getToken(programs);

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .add({
      instruction: createSettleInstruction(
        {
          protocol,
          rfq,
          response,
          quoteReceiverTokens,
          quoteEscrow,
          tokenProgram: tokenProgram.address,
        },
        rfqProgram.address
      ),
      signers: [],
      key: 'settle',
    });
};
