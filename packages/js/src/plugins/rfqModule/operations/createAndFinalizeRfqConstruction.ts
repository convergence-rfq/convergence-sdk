import { PublicKey } from '@solana/web3.js';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { SpotInstrument } from '../../spotInstrumentModule';
import { OrderType, QuoteAsset, FixedSize } from '../types';
import { Rfq } from '../models';
import { createRfqBuilder } from './createRfq';
import { finalizeRfqConstructionBuilder } from './finalizeRfqConstruction';
import { PsyoptionsAmericanInstrument } from '@/plugins/psyoptionsAmericanInstrumentModule';
import { PsyoptionsEuropeanInstrument } from '@/plugins/psyoptionsEuropeanInstrumentModule';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
  Signer,
  makeConfirmOptionsFinalizedOnMainnet,
} from '@/types';
import { Leg } from '@convergence-rfq/rfq';
import { Convergence } from '@/Convergence';
//@ts-ignore
import { Sha256 } from '@aws-crypto/sha256-js';
import * as anchor from '@project-serum/anchor';
import { TransactionBuilder, TransactionBuilderOptions } from '@/utils';
//@ts-ignore
import { calculateExpectedLegsHash, convertFixedSizeInput } from '../helpers';

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
  quoteAsset: QuoteAsset;

  /** The legs of the order. */
  instruments: (
    | SpotInstrument
    | PsyoptionsEuropeanInstrument
    | PsyoptionsAmericanInstrument
  )[];

  /** The type of order. */
  orderType: OrderType;

  /** The type of Rfq. */
  fixedSize: FixedSize;

  /** the active window. */
  activeWindow?: number;

  /** The settling window. */
  settlingWindow?: number;

  /** Optional address of the Taker's collateral info account. */
  collateralInfo?: PublicKey;

  /** Optional address of the Taker's collateral token account. */
  collateralToken?: PublicKey;

  /** Optional address of the risk engine account. */
  riskEngine?: PublicKey;
};

/**
 * @group Operations
 * @category Outputs
 */
export type CreateAndFinalizeRfqConstructionOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;

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
        orderType,
        // fixedSize,
        quoteAsset,
        instruments,
        activeWindow = 5_000,
        settlingWindow = 1_000,
      } = operation.input;
      let { fixedSize } = operation.input;

      const recentTimestamp = new anchor.BN(Math.floor(Date.now() / 1_000) - 1);

      fixedSize = convertFixedSizeInput(fixedSize);

      const serializedLegsData: Buffer[] = [];
      const legs: Leg[] = [];

      let expectedLegsHash: Uint8Array;
      // const expectedLegsHash = await calculateExpectedLegsHash(
      //   convergence,
      //   instruments
      // );

      for (const instrument of instruments) {
        if (instrument.legInfo?.amount) {
          instrument.legInfo.amount *= Math.pow(10, instrument.decimals);
        }

        const instrumentClient = convergence.instrument(
          instrument,
          instrument.legInfo
        );

        const leg = await instrumentClient.toLegData();

        serializedLegsData.push(instrumentClient.serializeLegData(leg));
        legs.push(leg);
      }

      const lengthBuffer = Buffer.alloc(4);
      lengthBuffer.writeInt32LE(instruments.length);
      const fullLegDataBuffer = Buffer.concat([
        lengthBuffer,
        ...serializedLegsData,
      ]);

      const hash = new Sha256();
      hash.update(fullLegDataBuffer);
      expectedLegsHash = hash.digestSync();

      const rfqPda = convergence
        .rfqs()
        .pdas()
        .rfq({
          taker: taker.publicKey,
          legsHash: Buffer.from(expectedLegsHash),
          orderType,
          quoteAsset,
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
          legs,
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
    legs: Leg[];
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
    {
      ...params,
    },
    options
  );
  const finalizeConstructionBuilder = await finalizeRfqConstructionBuilder(
    convergence,
    { ...params },
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
