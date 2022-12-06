import { PublicKey } from '@solana/web3.js';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
  Signer,
} from '@/types';
import { Convergence } from '@/Convergence';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { TransactionBuilder, TransactionBuilderOptions } from '@/utils';
import { makeConfirmOptionsFinalizedOnMainnet } from '@/types';
import {
  createPrepareMoreLegsSettlementInstruction,
  AuthoritySide,
} from '@convergence-rfq/rfq';

const Key = 'PrepareMoreLegsSettlementOperation' as const;

/**
 * Prepares more legs settlement
 *
 * ```ts
 * const rfq = await convergence
 *   .rfqs()
 *   .prepareMoreLegsSettlement({ address };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const prepareMoreLegsSettlementOperation =
  useOperation<PrepareMoreLegsSettlementOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type PrepareMoreLegsSettlementOperation = Operation<
  typeof Key,
  PrepareMoreLegsSettlementInput,
  PrepareMoreLegsSettlementOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type PrepareMoreLegsSettlementInput = {
  /**
   * The owner of the Rfq as a Signer.
   *
   * @defaultValue `convergence.identity()`
   */
  caller?: Signer;
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

  legAmountToPrepare: number;
};

/**
 * @group Operations
 * @category Outputs
 */
export type PrepareMoreLegsSettlementOutput = {
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const prepareMoreLegsSettlementOperationHandler: OperationHandler<PrepareMoreLegsSettlementOperation> =
  {
    handle: async (
      operation: PrepareMoreLegsSettlementOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<PrepareMoreLegsSettlementOutput> => {
      const builder = prepareMoreLegsSettlementBuilder(
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

export type PrepareMoreLegsSettlementBuilderParams =
  PrepareMoreLegsSettlementInput;

/**
 * Prepares more legs settlement
 *
 * ```ts
 * const transactionBuilder = await convergence
 *   .rfqs()
 *   .builders()
 *   .prepareMoreLegsSettlement();
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const prepareMoreLegsSettlementBuilder = (
  convergence: Convergence,
  params: PrepareMoreLegsSettlementBuilderParams,
  options: TransactionBuilderOptions = {}
): TransactionBuilder => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const rfqProgram = convergence.programs().getRfq(programs);

  const {
    caller = convergence.identity(),
    protocol,
    rfq,
    response,
    side,
    legAmountToPrepare,
  } = params;

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .add({
      instruction: createPrepareMoreLegsSettlementInstruction(
        {
          caller: caller.publicKey,
          protocol,
          rfq,
          response,
        },
        {
          side,
          legAmountToPrepare,
        },
        rfqProgram.address
      ),
      signers: [payer],
      key: 'prepareMoreLegsSettlement',
    });
};
