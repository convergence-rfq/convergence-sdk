import { createCancelResponseInstruction } from '@convergence-rfq/rfq';
import { PublicKey } from '@solana/web3.js';

import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { Convergence } from '../../../Convergence';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
  Signer,
  makeConfirmOptionsFinalizedOnMainnet,
} from '../../../types';
import { TransactionBuilder, TransactionBuilderOptions } from '../../../utils';

const Key = 'CancelResponseOperation' as const;

/**
 * Cancels an existing Response.
 *
 * const { rfq } = await convergence.rfqs.createAndFinalize(...);
 * const { rfqResponse } = await convergence.rfqs.().respond({ rfq: rfq.address, ... });
 *
 * ```ts
 * await convergence
 *   .rfqs()
 *   .cancelResponse({
 *     rfq: rfq.address,
 *     response: rfqResponse.address
 *   });
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const cancelResponseOperation =
  useOperation<CancelResponseOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type CancelResponseOperation = Operation<
  typeof Key,
  CancelResponseInput,
  CancelResponseOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type CancelResponseInput = {
  /**
   * The Maker as a Signer
   *
   * @defaultValue `convergence.identity()`
   */
  maker?: Signer;

  /** The protocol address.
   * @defaultValue `(await convergence.protocol().get()).address
   */
  protocol?: PublicKey;

  /** The address of the Rfq account. */
  rfq: PublicKey;

  /** The address of the Reponse account. */
  response: PublicKey;
};

/**
 * @group Operations
 * @category Outputs
 */
export type CancelResponseOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const cancelResponseOperationHandler: OperationHandler<CancelResponseOperation> =
  {
    handle: async (
      operation: CancelResponseOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<CancelResponseOutput> => {
      scope.throwIfCanceled();

      const builder = await cancelResponseBuilder(
        convergence,
        {
          ...operation.input,
        },
        scope
      );
      scope.throwIfCanceled();

      const confirmOptions = makeConfirmOptionsFinalizedOnMainnet(
        convergence,
        scope.confirmOptions
      );

      const output = await builder.sendAndConfirm(convergence, confirmOptions);
      scope.throwIfCanceled();

      return { ...output };
    },
  };

/**
 * @group Transaction Builders
 * @category Inputs
 */
export type CancelResponseBuilderParams = CancelResponseInput;

/**
 * Cancels an existing Response.
 *
 * ```ts
 * const transactionBuilder = convergence
 * .rfqs()
 * .builders()
 * .cancel({ address });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const cancelResponseBuilder = async (
  convergence: Convergence,
  params: CancelResponseBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<TransactionBuilder> => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const { maker = convergence.identity(), rfq, response } = params;

  const rfqProgram = convergence.programs().getRfq(programs);

  const protocol = await convergence.protocol().get();

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .add({
      instruction: createCancelResponseInstruction(
        {
          maker: maker.publicKey,
          protocol: protocol.address,
          rfq,
          response,
        },
        rfqProgram.address
      ),
      signers: [maker],
      key: 'cancelResponse',
    });
};
