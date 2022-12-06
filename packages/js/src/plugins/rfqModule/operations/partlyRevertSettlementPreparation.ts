import { PublicKey } from '@solana/web3.js';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '@/types';
import { Convergence } from '@/Convergence';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { TransactionBuilder, TransactionBuilderOptions } from '@/utils';
import { makeConfirmOptionsFinalizedOnMainnet } from '@/types';
import {
  createPartlyRevertSettlementPreparationInstruction,
  AuthoritySide,
} from '@convergence-rfq/rfq';

const Key = 'PartlyRevertSettlementPreparationOperation' as const;

/**
 * Partially reverts settlement preparations.
 *
 * ```ts
 * const rfq = await convergence
 *   .rfqs()
 *   .partlyRevertSettlementPreparation({ address };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const partlyRevertSettlementPreparationOperation =
  useOperation<PartlyRevertSettlementPreparationOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type PartlyRevertSettlementPreparationOperation = Operation<
  typeof Key,
  PartlyRevertSettlementPreparationInput,
  PartlyRevertSettlementPreparationOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type PartlyRevertSettlementPreparationInput = {
  /** The protocol address */
  protocol: PublicKey;
  /** The Rfq address */
  rfq: PublicKey;
  /** The response address */
  response: PublicKey;

  /*
   * Args
   */

  side: AuthoritySide;

  legAmountToRevert: number;
};

/**
 * @group Operations
 * @category Outputs
 */
export type PartlyRevertSettlementPreparationOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const partlyRevertSettlementPreparationOperationHandler: OperationHandler<PartlyRevertSettlementPreparationOperation> =
  {
    handle: async (
      operation: PartlyRevertSettlementPreparationOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<PartlyRevertSettlementPreparationOutput> => {
      const builder = await partlyRevertSettlementPreparationBuilder(
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

export type PartlyRevertSettlementPreparationBuilderParams =
  PartlyRevertSettlementPreparationInput;

/**
 * Partially reverts settlement preparations
 *
 * ```ts
 * const transactionBuilder = await convergence
 *   .rfqs()
 *   .builders()
 *   .partlyRevertSettlementPreparation();
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const partlyRevertSettlementPreparationBuilder = (
  convergence: Convergence,
  params: PartlyRevertSettlementPreparationBuilderParams,
  options: TransactionBuilderOptions = {}
): TransactionBuilder => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const rfqProgram = convergence.programs().getRfq(programs);

  const { protocol, rfq, response, side, legAmountToRevert } = params;

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .add({
      instruction: createPartlyRevertSettlementPreparationInstruction(
        {
          protocol,
          rfq,
          response,
        },
        {
          side,
          legAmountToRevert,
        },
        rfqProgram.address
      ),
      signers: [payer],
      key: 'partlyRevertSettlementPreparation',
    });
};
