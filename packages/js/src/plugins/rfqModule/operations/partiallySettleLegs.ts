import { PublicKey } from '@solana/web3.js';
import { createPartiallySettleLegsInstruction } from '@convergence-rfq/rfq';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
 makeConfirmOptionsFinalizedOnMainnet } from '@/types';
import { Convergence } from '@/Convergence';
import { TransactionBuilder, TransactionBuilderOptions } from '@/utils';

const Key = 'PartiallySettleLegsOperation' as const;

/**
 * Partially settles legs
 *
 * ```ts
 * const rfq = await convergence
 *   .rfqs()
 *   .partiallySettleLegs({ address };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const partiallySettleLegsOperation =
  useOperation<PartiallySettleLegsOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type PartiallySettleLegsOperation = Operation<
  typeof Key,
  PartiallySettleLegsInput,
  PartiallySettleLegsOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type PartiallySettleLegsInput = {
  /** The protocol address */
  protocol: PublicKey;
  /** The Rfq address */
  rfq: PublicKey;
  /** The response address */
  response: PublicKey;

  /*
   * Args
   */

  legAmountToSettle: number;
};

/**
 * @group Operations
 * @category Outputs
 */
export type PartiallySettleLegsOutput = {
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const partiallySettleLegsOperationHandler: OperationHandler<PartiallySettleLegsOperation> =
  {
    handle: async (
      operation: PartiallySettleLegsOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<PartiallySettleLegsOutput> => {
      const builder = await partiallySettleLegsBuilder(
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

      return output;
    },
  };

export type PartiallySettleLegsBuilderParams = PartiallySettleLegsInput;

/**
 * Partially settles legs
 *
 * ```ts
 * const transactionBuilder = await convergence
 *   .rfqs()
 *   .builders()
 *   .partiallySettleLegs();
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const partiallySettleLegsBuilder = (
  convergence: Convergence,
  params: PartiallySettleLegsBuilderParams,
  options: TransactionBuilderOptions = {}
): TransactionBuilder => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const rfqProgram = convergence.programs().getRfq(programs);

  const { protocol, rfq, response, legAmountToSettle } = params;

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .add({
      instruction: createPartiallySettleLegsInstruction(
        {
          protocol,
          rfq,
          response,
        },
        {
          legAmountToSettle,
        },
        rfqProgram.address
      ),
      signers: [],
      key: 'partiallySettleLegs',
    });
};
