import { createCancelResponseInstruction } from '@convergence-rfq/rfq';
import { PublicKey, Transaction } from '@solana/web3.js';

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
import { protocolCache } from '../../protocolModule/cache';

const Key = 'cancelMultipleResponseOperation' as const;

/**
 * Cancels an existing Response.
 *
 * const { rfq } = await convergence.rfqs.createAndFinalize(...);
 * const { rfqResponse } = await convergence.rfqs.().respond({ rfq: rfq.address, ... });
 *
 * ```ts
 * await convergence
 *   .rfqs()
 *   .cancelMultipleResponse({
 *     rfq: rfq.address,
 *     response: rfqResponse.address
 *   });
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const cancelMultipleResponseOperation =
  useOperation<CancelMultipleResponseOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type CancelMultipleResponseOperation = Operation<
  typeof Key,
  CancelMultipleResponseInput,
  CancelMultipleResponseOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type CancelMultipleResponseInput = {
  /**
   * The maker as a signer
   *
   * @defaultValue `convergence.identity()`
   */
  maker?: Signer;
  /**
   * The protocol address.
   *
   * @defaultValue `convergence.protocol().pdas().get()`
   */
  protocol?: PublicKey;
  /** The address of the reponse account. */
  responses: PublicKey[];
};

/**
 * @group Operations
 * @category Outputs
 */
export type CancelMultipleResponseOutput = {};

/**
 * @group Operations
 * @category Handlers
 */
export const cancelMultipleResponseOperationHandler: OperationHandler<CancelMultipleResponseOperation> =
  {
    handle: async (
      operation: CancelMultipleResponseOperation,
      convergence: Convergence,
      scope: OperationScope
    ) => {
      scope.throwIfCanceled();

      const txArray = await cancelMultipleResponseBuilder(
        convergence,
        {
          ...operation.input,
        },
        scope
      );
      scope.throwIfCanceled();
      const signedTnxs = await convergence
        .identity()
        .signAllTransactions(txArray);
      const confirmOptions = makeConfirmOptionsFinalizedOnMainnet(
        convergence,
        scope.confirmOptions
      );
      for (const tx of signedTnxs) {
        await convergence.rpc().serializeAndSendTransaction(tx, confirmOptions);
      }
      scope.throwIfCanceled();
    },
  };

/**
 * @group Transaction Builders
 * @category Inputs
 */
export type CancelMultipleResponseBuilderParams = CancelMultipleResponseInput;

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
export const cancelMultipleResponseBuilder = async (
  convergence: Convergence,
  params: CancelMultipleResponseBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<Transaction[]> => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const { maker = convergence.identity(), responses } = params;

  const rfqProgram = convergence.programs().getRfq(programs);
  const txArray: Transaction[] = [];
  const protocol = await protocolCache.get(convergence);
  for (const response of responses) {
    const responseModel = await convergence
      .rfqs()
      .findResponseByAddress({ address: response });
    const refreshedRfq = await convergence
      .rfqs()
      .findRfqByAddress({ address: responseModel.rfq });

    const txBuilder = TransactionBuilder.make()
      .setFeePayer(payer)
      .add({
        instruction: createCancelResponseInstruction(
          {
            maker: responseModel.maker,
            protocol: protocol.address,
            rfq: refreshedRfq.address,
            response,
          },
          rfqProgram.address
        ),
        signers: [maker],
        key: 'cancelMultipleResponse',
      });
    const blockHashWithBlockHeight = await convergence
      .rpc()
      .getLatestBlockhash();
    const tx = txBuilder.toTransaction(blockHashWithBlockHeight);
    txArray.push(tx);
  }
  return txArray;
};
