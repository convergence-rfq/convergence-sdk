import { createCancelResponseInstruction } from '@convergence-rfq/rfq';
import { PublicKey } from '@solana/web3.js';

import { Convergence } from '../../../Convergence';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
  Signer,
} from '../../../types';
import { TransactionBuilder, TransactionBuilderOptions } from '../../../utils';
import { SendAndConfirmTransactionResponse } from '@/plugins';

const Key = 'cancelResponseOperation' as const;

/**
 * Cancel multiple response.
 *
 * ```ts
 * await convergence.rfqs().cancelResponses({ responses });
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
   * The addresses of the reponses.
   */
  response: PublicKey;

  /**
   * The maker as a signer.
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
};

/**
 * @group Operations
 * @category Outputs
 */
export type CancelResponseOutput = {
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
    ) => {
      const builder = await cancelResponseBuilder(
        convergence,
        {
          ...operation.input,
        },
        scope
      );
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
export type CancelResponsesBuilderParams = CancelResponseInput;

/**
 * Cancels an existing Response.
 *
 * ```ts
 * const builder = convergence
 *   .rfqs()
 *   .builders()
 *   .cancel({
 *     response: <address>
 *   });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const cancelResponseBuilder = async (
  convergence: Convergence,
  params: CancelResponsesBuilderParams,
  options: TransactionBuilderOptions = {}
) => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const {
    response,
    maker = convergence.identity(),
    protocol = convergence.protocol().pdas().protocol(),
  } = params;

  const responseModel = await convergence
    .rfqs()
    .findResponseByAddress({ address: response });

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .add({
      instruction: createCancelResponseInstruction(
        {
          protocol,
          response: responseModel.address,
          rfq: responseModel.rfq,
          maker: responseModel.maker,
        },
        convergence.programs().getRfq(programs).address
      ),
      signers: [maker],
      key: 'cancelResponse',
    });
};
