import { createSettleOnePartyDefaultInstruction } from '@convergence-rfq/rfq';
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

const Key = 'SettleOnePartyDefaultOperation' as const;

/**
 * Settles one party default.
 *
 * ```ts
 * await convergence
 *   .rfqs()
 *   .settleOnePartyDefault({ address };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const settleOnePartyDefaultOperation =
  useOperation<SettleOnePartyDefaultOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type SettleOnePartyDefaultOperation = Operation<
  typeof Key,
  SettleOnePartyDefaultInput,
  SettleOnePartyDefaultOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type SettleOnePartyDefaultInput = {
  /** The address of the protocol account. */
  protocol: PublicKey;
  /** The address of the Rfq account. */
  rfq: PublicKey;
  /** The address of the Response account. */
  response: PublicKey;
  /** The address of the Taker's collateralInfo account. */
  takerCollateralInfo: PublicKey;
  /** The address of the Maker's collateralInfo account. */
  makerCollateralInfo: PublicKey;
  /** The address of the Taker's collateralTokens account. */
  takerCollateralTokens: PublicKey;
  /** The address of the Maker's collateralTokens account. */
  makerCollateralTokens: PublicKey;
};

/**
 * @group Operations
 * @category Outputs
 */
export type SettleOnePartyDefaultOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const settleOnePartyDefaultOperationHandler: OperationHandler<SettleOnePartyDefaultOperation> =
  {
    handle: async (
      operation: SettleOnePartyDefaultOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<SettleOnePartyDefaultOutput> => {
      scope.throwIfCanceled();

      return settleOnePartyDefaultBuilder(
        convergence,
        operation.input,
        scope
      ).sendAndConfirm(convergence, scope.confirmOptions);
    },
  };

/**
 * @group Transaction Builders
 * @category Inputs
 */
export type SettleOnePartyDefaultBuilderParams = SettleOnePartyDefaultInput;

/**
 * Settles one party default
 *
 * ```ts
 * const transactionBuilder = convergence
 *   .rfqs()
 *   .builders()
 *   .settleOnePartyDefault({ address });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const settleOnePartyDefaultBuilder = (
  convergence: Convergence,
  params: SettleOnePartyDefaultBuilderParams,
  options: TransactionBuilderOptions = {}
): TransactionBuilder => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const {
    protocol,
    rfq,
    response,
    takerCollateralInfo,
    makerCollateralInfo,
    takerCollateralTokens,
    makerCollateralTokens,
  } = params;

  const rfqProgram = convergence.programs().getRfq(programs);
  const tokenProgram = convergence.programs().getToken(programs);

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .add({
      instruction: createSettleOnePartyDefaultInstruction(
        {
          protocol,
          rfq,
          response,
          takerCollateralInfo,
          makerCollateralInfo,
          takerCollateralTokens,
          makerCollateralTokens,
          tokenProgram: tokenProgram.address,
        },
        rfqProgram.address
      ),
      signers: [],
      key: 'settleOnePartyDefault',
    });
};
