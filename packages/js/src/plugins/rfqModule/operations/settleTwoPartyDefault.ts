import { createSettleTwoPartyDefaultInstruction } from '@convergence-rfq/rfq';
import { PublicKey } from '@solana/web3.js';

import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { Convergence } from '../../../Convergence';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
  makeConfirmOptionsFinalizedOnMainnet,
} from '../../../types';
import { TransactionBuilder, TransactionBuilderOptions } from '../../../utils';

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
  /** The protocol address.
   * @defaultValue `(await convergence.protocol().get()).address
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

  /**
   * Optional address of the Taker's collateral tokens account.
   *
   * @defaultValue `convergence.collateral().pdas().
   *   collateralTokens({
   *     user: rfq.taker,
   *   })`
   */
  takerCollateralTokens?: PublicKey;

  /**
   * Optional address of the Maker's collateral tokens account.
   *
   * @defaultValue `convergence.collateral().pdas().
   *   collateralTokens({
   *     user: response.maker,
   *   })`
   */
  makerCollateralTokens?: PublicKey;

  /**
   * Optional address of the DAO's collateral tokens account.
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
      const builder = await settleTwoPartyDefaultBuilder(
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
export const settleTwoPartyDefaultBuilder = async (
  convergence: Convergence,
  params: SettleTwoPartyDefaultBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<TransactionBuilder> => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const { rfq, response } = params;

  const rfqProgram = convergence.programs().getRfq(programs);
  const tokenProgram = convergence.programs().getToken(programs);

  const protocol = await convergence.protocol().get();

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
    .add({
      instruction: createSettleTwoPartyDefaultInstruction(
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
      key: 'settleTwoPartyDefault',
    });
};
