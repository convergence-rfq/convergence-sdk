import { createSettleOnePartyDefaultInstruction } from '@convergence-rfq/rfq';
import { PublicKey } from '@solana/web3.js';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { Convergence } from '@/Convergence';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
  makeConfirmOptionsFinalizedOnMainnet,
} from '@/types';
import { TransactionBuilder, TransactionBuilderOptions } from '@/utils';

const Key = 'SettleOnePartyDefaultOperation' as const;

/**
 * Settles one party default.
 *
 * ```ts
 * await convergence
 *   .rfqs()
 *   .settleOnePartyDefault({
 *     rfq: rfq.address,
 *     response: rfqResponse.address
 *    };
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
  /** The address of the protocol. */
  protocol?: PublicKey;

  /** The address of the Rfq account. */
  rfq: PublicKey;

  /** The address of the Response account. */
  response: PublicKey;

  /** Optional address of the Taker's collateral info account. */
  takerCollateralInfo?: PublicKey;

  /** Optional address of the Maker's collateral info account. */
  makerCollateralInfo?: PublicKey;

  /** Optional address of the Taker's collateral token account. */
  takerCollateralTokens?: PublicKey;

  /** Optional address of the Maker's collateral token account. */
  makerCollateralTokens?: PublicKey;
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
      const builder = await settleOnePartyDefaultBuilder(
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
export const settleOnePartyDefaultBuilder = async (
  convergence: Convergence,
  params: SettleOnePartyDefaultBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<TransactionBuilder> => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const { rfq, response } = params;

  const protocol = await convergence.protocol().get();

  const rfqProgram = convergence.programs().getRfq(programs);
  const tokenProgram = convergence.programs().getToken(programs);

  const rfqModel = await convergence.rfqs().findRfqByAddress({ address: rfq });
  const responseModel = await convergence
    .rfqs()
    .findResponseByAddress({ address: response });

  let {
    takerCollateralInfo,
    makerCollateralInfo,
    takerCollateralTokens,
    makerCollateralTokens,
  } = params;

  const takerCollateralInfoPda = convergence
    .collateral()
    .pdas()
    .collateralInfo({
      user: rfqModel.taker,
      programs,
    });
  const makerCollateralInfoPda = convergence
    .collateral()
    .pdas()
    .collateralInfo({
      user: responseModel.maker,
      programs,
    });
  const takerCollateralTokensPda = convergence
    .collateral()
    .pdas()
    .collateralToken({
      user: rfqModel.taker,
      programs,
    });
  const makerCollateralTokensPda = convergence
    .collateral()
    .pdas()
    .collateralToken({
      user: responseModel.maker,
      programs,
    });

  takerCollateralInfo = takerCollateralInfo ?? takerCollateralInfoPda;
  makerCollateralInfo = makerCollateralInfo ?? makerCollateralInfoPda;
  takerCollateralTokens = takerCollateralTokens ?? takerCollateralTokensPda;
  makerCollateralTokens = makerCollateralTokens ?? makerCollateralTokensPda;

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .add({
      instruction: createSettleOnePartyDefaultInstruction(
        {
          protocol: protocol.address,
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
