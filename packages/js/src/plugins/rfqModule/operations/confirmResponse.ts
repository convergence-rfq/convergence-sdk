import { createConfirmResponseInstruction } from '@convergence-rfq/rfq';
import { PublicKey } from '@solana/web3.js';

import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { Convergence } from '../../../Convergence';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
  Signer,
} from '../../../types';
import {
  TransactionBuilder,
  TransactionBuilderOptions,
} from '../../../utils/TransactionBuilder';
import { Response } from '../models';
import { ResponseSide, toSolitaQuoteSide } from '../models/ResponseSide';
import { toSolitaOverrideLegMultiplierBps } from '../models/Confirmation';

const Key = 'ConfirmResponseOperation' as const;

/**
 * Confirms a response.
 *
 * ```ts
 * await convergence
 *   .rfqs()
 *   .confirmResponse({
 *     rfq: <publicKey>,
 *     response: <publicKey>,
 *     side: 'bid' | 'ask'
 *   });
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const confirmResponseOperation =
  useOperation<ConfirmResponseOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type ConfirmResponseOperation = Operation<
  typeof Key,
  ConfirmResponseInput,
  ConfirmResponseOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type ConfirmResponseInput = {
  /** The address of the RFQ account. */
  rfq: PublicKey;

  /** The address of the response account. */
  response: PublicKey;

  /**
   * The taker of the Rfq as a Signer.
   *
   * @defaultValue `convergence.identity()`
   */
  taker?: Signer;

  /**
   * Optional address of the taker collateral info account.
   *
   * @defaultValue `convergence.collateral().pdas().collateralInfo({ user: taker.publicKey })`
   */
  collateralInfo?: PublicKey;

  /**
   * Optional address of the maker collateral info account.
   *
   * @defaultValue `convergence.collateral().pdas().collateralInfo({ user: response.maker })`
   */
  makerCollateralInfo?: PublicKey;

  /** The address of the collateral token. */
  collateralToken?: PublicKey;

  /**
   * The protocol address.
   *
   * @defaultValue `convergence.protocol().pdas().protocol()`
   */
  protocol?: PublicKey;

  /** The address of the risk engine program. */
  riskEngine?: PublicKey;

  /** The Side of the Response to confirm. */
  side: ResponseSide;

  /**
   * Optional basis points multiplier to override the legsMultiplierBps of the
   * Rfq's fixedSize property.
   */
  overrideLegMultiplier?: number;
};

/**
 * @group Operations
 * @category Outputs
 */
export type ConfirmResponseOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const confirmResponseOperationHandler: OperationHandler<ConfirmResponseOperation> =
  {
    handle: async (
      operation: ConfirmResponseOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<ConfirmResponseOutput> => {
      const builder = await confirmResponseBuilder(
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

      return { ...output };
    },
  };

/**
 * @group Transaction Builders
 * @category Inputs
 */
export type ConfirmResponseBuilderParams = ConfirmResponseInput;

/**
 * Confirms a response
 *
 * ```ts
 * const transactionBuilder = convergence
 *   .rfqs()
 *   .builders()
 *   .confirmResponse({ address });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const confirmResponseBuilder = async (
  convergence: Convergence,
  params: ConfirmResponseBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<TransactionBuilder> => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const {
    rfq,
    response,
    side,
    taker = convergence.identity(),
    collateralInfo = convergence.collateral().pdas().collateralInfo({
      user: taker.publicKey,
      programs,
    }),
    collateralToken = convergence.collateral().pdas().collateralToken({
      user: taker.publicKey,
      programs,
    }),
  } = params;

  const responseModel = await convergence
    .rfqs()
    .findResponseByAddress({ address: response });

  if (isResponseExpired(responseModel)) {
    throw new Error('Response is expired');
  }

  const { overrideLegMultiplier = null } = params;
  const overrideLegMultiplierBps =
    overrideLegMultiplier &&
    toSolitaOverrideLegMultiplierBps(overrideLegMultiplier);

  const makerCollateralInfo = convergence.collateral().pdas().collateralInfo({
    user: responseModel.maker,
    programs,
  });

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .add({
      instruction: createConfirmResponseInstruction(
        {
          rfq,
          response,
          collateralInfo,
          makerCollateralInfo,
          collateralToken,
          taker: taker.publicKey,
          protocol: convergence.protocol().pdas().protocol(),
          riskEngine: convergence.programs().getRiskEngine(programs).address,
        },
        {
          side: toSolitaQuoteSide(side),
          overrideLegMultiplierBps,
        },
        convergence.programs().getRfq(programs).address
      ),
      signers: [taker],
      key: 'confirmResponse',
    });
};

const isResponseExpired = (response: Response): boolean => {
  return Date.now() > response.expirationTimestamp;
};
