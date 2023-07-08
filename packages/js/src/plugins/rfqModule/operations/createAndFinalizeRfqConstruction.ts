import { PublicKey } from '@solana/web3.js';
import * as anchor from '@project-serum/anchor';

import { BN } from 'bn.js';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { assertRfq, FixedSize, Rfq } from '../models';

import { calculateExpectedLegsHash } from '../helpers';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
  Signer,
  makeConfirmOptionsFinalizedOnMainnet,
} from '../../../types';
import { Convergence } from '../../../Convergence';
import { TransactionBuilder, TransactionBuilderOptions } from '../../../utils';
import {
  LegInstrument,
  QuoteInstrument,
  toQuote,
} from '../../../plugins/instrumentModule';
import { OrderType } from '../models/OrderType';
import { createRfqBuilder } from './createRfq';
import { finalizeRfqConstructionBuilder } from './finalizeRfqConstruction';

const Key = 'CreateAndFinalizeRfqConstructionOperation' as const;

/**
 * Creates and finalizes construction of an Rfq.
 *
 * ```ts
 * const spotInstrument = new SpotInstrument(...);
 * const quoteAsset = instrumentClient.createQuote(new SpotInstrument(...));
 *
 * const { rfq } = await convergence
 *   .rfqs()
 *   .createAndFinalize({
 *     quoteAsset,
 *     instruments: [spotInstrument],
 *     orderType: OrderType.Sell,
 *     fixedSize: {
 *       __kind: 'BaseAsset',
 *       legsMultiplierBps: 1_000_000_000
 *     },
 *     activeWindow: 5_000,
 *     settlingWindow: 1_000
 *   });
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const createAndFinalizeRfqConstructionOperation =
  useOperation<CreateAndFinalizeRfqConstructionOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type CreateAndFinalizeRfqConstructionOperation = Operation<
  typeof Key,
  CreateAndFinalizeRfqConstructionInput,
  CreateAndFinalizeRfqConstructionOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type CreateAndFinalizeRfqConstructionInput = {
  /**
   * The taker of the Rfq to create.
   *
   * @defaultValue `convergence.identity().publicKey`
   */
  taker?: Signer;

  /** Quote asset account. */
  quoteAsset: QuoteInstrument;

  /** The legs of the order. */
  instruments: LegInstrument[];

  /** The type of order. */
  orderType: OrderType;

  /**
   * The type of the Rfq, specifying whether we fix the number of
   * base assets to be exchanged, the number of quote assets,
   * or neither.
   */
  fixedSize: FixedSize;

  /**
   * Optional active window (in seconds).
   *
   * @defaultValue `5_000`
   */
  activeWindow?: number;

  /**
   * Optional settling window (in seconds).
   *
   * @defaultValue `1_000`
   */
  settlingWindow?: number;

  /**
   * Optional address of the Taker's collateral info account.
   *
   * @defaultValue `convergence.collateral().pdas().collateralInfo({ user: taker.publicKey })`
   */
  collateralInfo?: PublicKey;

  /**
   * Optional address of the Taker's collateral tokens account.
   *
   * @defaultValue `convergence.collateral().pdas().
   *   collateralTokens({
   *     user: taker.publicKey,
   *   })`
   */
  collateralToken?: PublicKey;

  /** Optional address of the risk engine program account. */
  riskEngine?: PublicKey;
};

/**
 * @group Operations
 * @category Outputs
 */
export type CreateAndFinalizeRfqConstructionOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;

  /** The newly created Rfq. */
  rfq: Rfq;
};

/**
 * @group Operations
 * @category Handlers
 */
export const createAndFinalizeRfqConstructionOperationHandler: OperationHandler<CreateAndFinalizeRfqConstructionOperation> =
  {
    handle: async (
      operation: CreateAndFinalizeRfqConstructionOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<CreateAndFinalizeRfqConstructionOutput> => {
      const {
        taker = convergence.identity(),
        instruments,
        orderType,
        fixedSize,
        quoteAsset,
        activeWindow = 5_000,
        settlingWindow = 1_000,
      } = operation.input;

      const recentTimestamp = new BN(Math.floor(Date.now() / 1_000) - 10);

      const expectedLegsHash = calculateExpectedLegsHash(instruments);

      const rfqPda = convergence
        .rfqs()
        .pdas()
        .rfq({
          taker: taker.publicKey,
          legsHash: Buffer.from(expectedLegsHash),
          orderType,
          quoteAsset: toQuote(quoteAsset),
          fixedSize,
          activeWindow,
          settlingWindow,
          recentTimestamp,
        });

      const builder = await createAndFinalizeRfqConstructionBuilder(
        convergence,
        {
          ...operation.input,
          taker,
          rfq: rfqPda,
          fixedSize,
          instruments,
          expectedLegsHash,
          recentTimestamp,
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

      const rfq = await convergence
        .rfqs()
        .findRfqByAddress({ address: rfqPda });
      assertRfq(rfq);

      return { ...output, rfq };
    },
  };

/**
 * @group Transaction Builders
 * @category Inputs
 */
export type CreateAndFinalizeRfqConstructionBuilderParams =
  CreateAndFinalizeRfqConstructionInput & {
    expectedLegsHash: Uint8Array;
    recentTimestamp: anchor.BN;
    rfq: PublicKey;
  };

export const createAndFinalizeRfqConstructionBuilder = async (
  convergence: Convergence,
  params: CreateAndFinalizeRfqConstructionBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<TransactionBuilder> => {
  const { payer = convergence.rpc().getDefaultFeePayer() } = options;
  const { rfq } = params;

  const rfqBuilder = await createRfqBuilder(
    convergence,
    { ...params },
    options
  );
  const finalizeConstructionBuilder = await finalizeRfqConstructionBuilder(
    convergence,
    { ...params, legs: params.instruments },
    options
  );

  return TransactionBuilder.make()
    .setContext({
      rfq,
    })
    .setFeePayer(payer)
    .add(
      ...rfqBuilder.getInstructionsWithSigners(),
      ...finalizeConstructionBuilder.getInstructionsWithSigners()
    );
};
