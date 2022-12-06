import { createSettleTwoPartyDefaultInstruction } from '@convergence-rfq/rfq';
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

const Key = 'SettleTwoPartyDefaultOperation' as const;

/**
 * Settles two party default.
 *
 * ```ts
 * await convergence
 *   .rfqs()
 *   .settleTwoPartyDefault({ address };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const settleTwoPartyDefaultOperation =
  useOperation<SettleTwoPartyDefaultOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type SettleTwoPartyDefaultOperation = Operation<
  typeof Key,
  SettleTwoPartyDefaultInput,
  SettleTwoPartyDefaultOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type SettleTwoPartyDefaultInput = {
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
  /** The address of the protocol's collateralTokens account. */
  protocolCollateralTokens: PublicKey;
};

/**
 * @group Operations
 * @category Outputs
 */
export type SettleTwoPartyDefaultOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const settleTwoPartyDefaultOperationHandler: OperationHandler<SettleTwoPartyDefaultOperation> =
  {
    handle: async (
      operation: SettleTwoPartyDefaultOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<SettleTwoPartyDefaultOutput> => {
      scope.throwIfCanceled();

      return settleTwoPartyDefaultBuilder(
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
export type SettleTwoPartyDefaultBuilderParams = SettleTwoPartyDefaultInput;

/**
 * Settles two party default
 *
 * ```ts
 * const transactionBuilder = convergence
 *   .rfqs()
 *   .builders()
 *   .settleTwoPartyDefault({ address });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const settleTwoPartyDefaultBuilder = (
  convergence: Convergence,
  params: SettleTwoPartyDefaultBuilderParams,
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
    protocolCollateralTokens,
  } = params;

  const rfqProgram = convergence.programs().getRfq(programs);
  const tokenProgram = convergence.programs().getToken(programs);

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .add({
      instruction: createSettleTwoPartyDefaultInstruction(
        {
          protocol,
          rfq,
          response,
          takerCollateralInfo,
          makerCollateralInfo,
          takerCollateralTokens,
          makerCollateralTokens,
          protocolCollateralTokens,
          tokenProgram: tokenProgram.address,
        },
        rfqProgram.address
      ),
      signers: [payer],
      key: 'settleTwoPartyDefault',
    });
};
