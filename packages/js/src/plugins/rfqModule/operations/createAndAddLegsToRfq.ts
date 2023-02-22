import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { OrderType, FixedSize, QuoteAsset } from '../types';
import { SpotInstrument } from '../../spotInstrumentModule';
import { PsyoptionsEuropeanInstrument } from '../../psyoptionsEuropeanInstrumentModule';
import { assertRfq, Rfq } from '../models';
import { createRfqBuilder } from './createRfq';
import { addLegsToRfqBuilder } from './addLegsToRfq';
import { PsyoptionsAmericanInstrument } from '@/plugins/psyoptionsAmericanInstrumentModule';
import * as anchor from '@project-serum/anchor';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
  Signer,
  makeConfirmOptionsFinalizedOnMainnet,
} from '@/types';
import { Convergence } from '@/Convergence';
import {
  calculateExpectedLegsHash,
  calculateExpectedLegsSize,
  convertFixedSizeInput,
} from '../helpers';

const Key = 'CreateAndAddLegsToRfqOperation' as const;

/**
 * Creates an Rfq with the maximum number of instruments, then calls
 *   `addLegsToRfq` with the remaining legs
 *
 * ```ts
 * const spotInstrument1 = new SpotInstrument(...);
 * const spotInstrument2 = new SpotInstrument(...);
 * const psyoptionsEuropeanInstrument = new PsyOptionsEuropeanInstrument(...);
 * const quoteAsset = instrumentClient.createQuote(new SpotInstrument(...));
 *
 * await convergence
 *   .rfqs()
 *   .createRfqAndAddLegs({
 *     quoteAsset,
 *     instruments: [spotInstrument1, spotInstrument2, psyoptionsEuropeanInstrument],
 *     orderType: OrderType.TwoWay,
 *     fixedSize: { __kind: 'QuoteAsset', quoteAmount: 1 },
 *     activeWindow: 5_000,
 *     settlingWindow: 1_000,
 *   };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const createAndAddLegsToRfqOperation =
  useOperation<CreateAndAddLegsToRfqOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type CreateAndAddLegsToRfqOperation = Operation<
  typeof Key,
  CreateAndAddLegsToRfqInput,
  CreateAndAddLegsToRfqOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type CreateAndAddLegsToRfqInput = {
  /**
   * The taker of the Rfq to create.
   *
   * @defaultValue `convergence.identity()`
   */
  taker?: Signer;

  /** The quote asset account. */
  quoteAsset: QuoteAsset;

  /** The instruments of the order, used to construct legs. */
  instruments: (
    | SpotInstrument
    | PsyoptionsEuropeanInstrument
    | PsyoptionsAmericanInstrument
  )[];

  /**
   * The type of order.
   *
   * @defaultValue Defaults to creating a two-way order
   */
  orderType: OrderType;

  /** The type of the Rfq, specifying whether we fix the number of
   * base assets to be exchanged, the number of quote assets,
   * or neither.
   */
  fixedSize: FixedSize;

  /** The active window (in seconds). */
  activeWindow?: number;

  /** The settling window (in seconds). */
  settlingWindow?: number;

  /** The sum of the sizes of all legs of the Rfq,
   * including legs added in the future (if any).
   * This can be calculated automatically if
   * additional legs will not be added in
   * the future. */
  expectedLegsSize?: number;

  /** Optional expected legs hash (of all legs).
   * This can be calculated automatically if
   * additional legs will not be added in the future.
   */
  expectedLegsHash?: Uint8Array;
};

/**
 * @group Operations
 * @category Outputs
 */
export type CreateAndAddLegsToRfqOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;

  rfq: Rfq;
};

/**
 * @group Operations
 * @category Handlers
 */

export const createAndAddLegsToRfqOperationHandler: OperationHandler<CreateAndAddLegsToRfqOperation> =
  {
    handle: async (
      operation: CreateAndAddLegsToRfqOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<CreateAndAddLegsToRfqOutput> => {
      const {
        taker = convergence.identity(),
        orderType,
        quoteAsset,
        activeWindow = 5_000,
        settlingWindow = 1_000,
      } = operation.input;
      let { fixedSize, instruments, expectedLegsSize, expectedLegsHash } =
        operation.input;

      const recentTimestamp = new anchor.BN(Math.floor(Date.now() / 1000) - 1);

      fixedSize = convertFixedSizeInput(fixedSize, quoteAsset);
      //TODO: dont need to convert instruments? test passing...
      // instruments = convertInstrumentsInput(instruments);
      expectedLegsSize =
        expectedLegsSize ??
        (await calculateExpectedLegsSize(convergence, instruments));
      expectedLegsHash =
        expectedLegsHash ??
        (await calculateExpectedLegsHash(convergence, instruments));

      let rfqPda = convergence
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

      const MAX_TX_SIZE = 1232;

      let rfqBuilder = await createRfqBuilder(
        convergence,
        {
          ...operation.input,
          rfq: rfqPda,
          fixedSize,
          instruments,
          recentTimestamp,
          expectedLegsSize,
          expectedLegsHash,
        },
        scope
      );
      scope.throwIfCanceled();

      let createRfqTxSize = await convergence
        .rpc()
        .getTransactionSize(rfqBuilder, [taker]);

      let slicedInstruments = instruments;

      while (createRfqTxSize == -1 || createRfqTxSize + 193 > MAX_TX_SIZE) {
        const halvedInstruments = slicedInstruments.slice(
          0,
          Math.trunc(slicedInstruments.length / 2)
        );

        rfqBuilder = await createRfqBuilder(
          convergence,
          {
            ...operation.input,
            rfq: rfqPda,
            fixedSize,
            instruments: halvedInstruments,
            recentTimestamp,
            expectedLegsSize,
            expectedLegsHash,
          },
          scope
        );

        createRfqTxSize = await convergence
          .rpc()
          .getTransactionSize(rfqBuilder, [taker]);

        slicedInstruments = halvedInstruments;
      }

      const confirmOptions = makeConfirmOptionsFinalizedOnMainnet(
        convergence,
        scope.confirmOptions
      );

      const output = await rfqBuilder.sendAndConfirm(
        convergence,
        confirmOptions
      );
      scope.throwIfCanceled();

      let addLegsTxSize = 0;

      if (slicedInstruments.length < instruments.length) {
        let addLegsSlicedInstruments = instruments.slice(
          slicedInstruments.length
        );

        let addLegsBuilder = await addLegsToRfqBuilder(
          convergence,
          {
            ...operation.input,
            rfq: rfqPda,
            instruments: addLegsSlicedInstruments,
          },
          scope
        );

        addLegsTxSize = await convergence
          .rpc()
          .getTransactionSize(addLegsBuilder, [taker]);

        while (addLegsTxSize == -1 || addLegsTxSize + 193 > MAX_TX_SIZE) {
          const halvedInstruments = addLegsSlicedInstruments.slice(
            0,
            Math.trunc(addLegsSlicedInstruments.length / 2)
          );

          addLegsBuilder = await addLegsToRfqBuilder(
            convergence,
            {
              ...operation.input,
              rfq: rfqPda,
              instruments: halvedInstruments,
            },
            scope
          );

          addLegsTxSize = await convergence
            .rpc()
            .getTransactionSize(addLegsBuilder, [taker]);

          addLegsSlicedInstruments = halvedInstruments;
        }

        await addLegsBuilder.sendAndConfirm(convergence, confirmOptions);
        scope.throwIfCanceled();

        const nextAddLegsSlicedInstruments = addLegsSlicedInstruments;

        if (
          addLegsSlicedInstruments.length <
          instruments.slice(slicedInstruments.length).length
        ) {
          while (
            nextAddLegsSlicedInstruments.length + slicedInstruments.length <
            instruments.length
          ) {
            const nextAddLegsInstruments = instruments.slice(
              slicedInstruments.length + nextAddLegsSlicedInstruments.length, //offset of createRfq legs + addLegs legs
              slicedInstruments.length +
                nextAddLegsSlicedInstruments.length +
                addLegsSlicedInstruments.length //num of legs successfully passed to addLegs
            );

            const nextAddLegsBuilder = await addLegsToRfqBuilder(
              convergence,
              {
                ...operation.input,
                rfq: rfqPda,
                instruments: nextAddLegsInstruments,
              },
              scope
            );

            await nextAddLegsBuilder.sendAndConfirm(
              convergence,
              confirmOptions
            );

            nextAddLegsSlicedInstruments.push(...nextAddLegsInstruments);
          }
        }
      }
      const rfq = await convergence
        .rfqs()
        .findRfqByAddress({ address: rfqPda });
      assertRfq(rfq);

      return { ...output, rfq };
    },
  };
