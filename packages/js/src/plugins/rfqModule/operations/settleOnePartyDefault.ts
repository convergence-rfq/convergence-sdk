import { createSettleOnePartyDefaultInstruction } from '@convergence-rfq/rfq';
import { ComputeBudgetProgram, PublicKey } from '@solana/web3.js';

import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { Convergence } from '../../../Convergence';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
  makeConfirmOptionsFinalizedOnMainnet,
} from '../../../types';
import {
  TransactionBuilder,
  TransactionBuilderOptions,
} from '../../../utils/TransactionBuilder';
import { protocolCache } from '../../protocolModule/cache';
import { TRANSACTION_PRIORITY_FEE_MAP } from '@/constants';

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
  /**
   * The protocol address.
   *
   * @defaultValue `convergence.protocol().pdas().protocol(),`
   */
  protocol?: PublicKey;

  /** The address of the Rfq account. */
  rfq: PublicKey;

  /** The address of the Response account. */
  response: PublicKey;

  /**
   * Optional address of the Taker's collateral info account.
   *
   * @defaultValue `convergence.collateral().pdas().collateralInfo({ user: rfq.taker })`
   *
   */
  takerCollateralInfo?: PublicKey;

  /**
   * Optional address of the Maker's collateral info account.
   *
   * @defaultValue `convergence.collateral().pdas().collateralInfo({ user: response.maker })`
   *
   */
  makerCollateralInfo?: PublicKey;

  /** Optional address of the Taker's collateral tokens account.
   *
   * @defaultValue `convergence.collateral().pdas().
   *   collateralTokens({
   *     user: rfq.taker,
   *   })`
   */
  takerCollateralTokens?: PublicKey;

  /** Optional address of the Maker's collateral tokens account.
   *
   * @defaultValue `convergence.collateral().pdas().
   *   collateralTokens({
   *     user: response.maker,
   *   })`
   */
  makerCollateralTokens?: PublicKey;

  /** Optional address of the DAO's collateral tokens account.
   *
   * @defaultValue `convergence.collateral().pdas().
   *   collateralTokens({
   *     user: dao
   *   })`
   */
  protocolCollateralTokens?: PublicKey;
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

  const protocol = await protocolCache.get(convergence);

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
    protocolCollateralTokens,
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
  const protocolCollateralTokensPda = convergence
    .collateral()
    .pdas()
    .collateralToken({
      user: protocol.authority,
      programs,
    });

  takerCollateralInfo = takerCollateralInfo ?? takerCollateralInfoPda;
  makerCollateralInfo = makerCollateralInfo ?? makerCollateralInfoPda;
  takerCollateralTokens = takerCollateralTokens ?? takerCollateralTokensPda;
  makerCollateralTokens = makerCollateralTokens ?? makerCollateralTokensPda;
  protocolCollateralTokens =
    protocolCollateralTokens ?? protocolCollateralTokensPda;

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .add(
      {
        instruction: ComputeBudgetProgram.setComputeUnitPrice({
          microLamports:
            TRANSACTION_PRIORITY_FEE_MAP[convergence.transactionPriority] ??
            TRANSACTION_PRIORITY_FEE_MAP['none'],
        }),
        signers: [],
      },
      {
        instruction: createSettleOnePartyDefaultInstruction(
          {
            protocol: protocol.address,
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
        signers: [],
        key: 'settleOnePartyDefault',
      }
    );
};
