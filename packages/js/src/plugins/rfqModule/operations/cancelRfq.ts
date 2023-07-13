import { createCancelRfqInstruction } from '@convergence-rfq/rfq';
import { PublicKey } from '@solana/web3.js';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';

import { Convergence } from '../../../Convergence';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
  Signer,
} from '../../../types';
import {
  TransactionBuilder,
  TransactionBuilderOptions,
} from '../../../utils/TransactionBuilder';

const Key = 'CancelRfqOperation' as const;

/**
 * Cancels an existing Rfq.
 *
 * ```ts
 * await convergence
 *   .rfqs()
 *   .cancelRfq({ rfq: <address> });
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
  /** The address of the Rfq account. */
  rfq: PublicKey;

  /**
   * The Taker of the Rfq as a Signer.
   *
   * @defaultValue `convergence.identity()`
   */
  taker?: Signer;

  /**
   * The protocol address.
   *
   * @defaultValue `convergence.protocol().pdas().protocol()`
   */
  protocol?: PublicKey;
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
  ) => {
    const builder = await cancelRfqBuilder(convergence, operation.input, scope);
    const output = await builder.sendAndConfirm(
      convergence,
      scope.confirmOptions
    );
    scope.throwIfCanceled();

    return output;
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
export const cancelRfqBuilder = async (
  convergence: Convergence,
  params: CancelRfqBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<TransactionBuilder> => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const {
    rfq,
    taker = convergence.identity(),
    protocol = convergence.protocol().pdas().protocol(),
  } = params;
  return TransactionBuilder.make()
    .setFeePayer(payer)
    .add({
      instruction: createCancelRfqInstruction(
        {
          protocol,
          rfq,
          taker: taker.publicKey,
        },
        convergence.programs().getRfq(programs).address
      ),
      signers: [taker],
      key: 'cancelRfq',
    });
};
