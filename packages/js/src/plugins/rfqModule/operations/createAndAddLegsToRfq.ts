import { Keypair } from '@solana/web3.js';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { Convergence } from '@/Convergence';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
  Signer,
  makeConfirmOptionsFinalizedOnMainnet,
} from '@/types';
import { OrderType, FixedSize, QuoteAsset } from '../types';
import { SpotInstrument } from '../../spotInstrumentModule';
import { PsyoptionsEuropeanInstrument } from '../../psyoptionsEuropeanInstrumentModule';
import { PsyoptionsAmericanInstrument } from '@/plugins/psyoptionsAmericanInstrumentModule';
import { createRfqBuilder } from './createRfq';
import { addLegsToRfqBuilder } from './addLegsToRfq';
import { assertRfq, Rfq } from '../models';

const Key = 'CreateAndAddLegsToRfqOperation' as const;

/**
 * Prepares for settlement.
 *
 * ```ts
 * await convergence
 *   .rfqs()
 *   .createAndAddLegsToRfq({ caller, rfq, response, side, legAmountToPrepare, quoteAsset };
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
   * @defaultValue `convergence.identity().publicKey`
   */
  taker?: Signer;

  /** Optional Rfq keypair */
  keypair?: Keypair;

  /** Optional quote asset account. */
  quoteAsset: QuoteAsset;

  /** The legs of the order. */
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

  fixedSize: FixedSize;

  activeWindow?: number;

  settlingWindow?: number;

  legSize?: number;
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
        keypair = Keypair.generate(),
        taker = convergence.identity(),
        instruments,
      } = operation.input;

      const MAX_TX_SIZE = 1232;

      let expectedLegSize = 4;

      for (const instrument of instruments) {
        const instrumentClient = convergence.instrument(
          instrument,
          instrument.legInfo
        );
        expectedLegSize += await instrumentClient.getLegDataSize();
      }

      let rfqBuilder = await createRfqBuilder(
        convergence,
        {
          ...operation.input,
          keypair,
          legSize: expectedLegSize,
        },
        scope
      );
      scope.throwIfCanceled();

      let txSize = await convergence
        .rpc()
        .getTransactionSize(rfqBuilder, [taker, keypair]);

      let slicedInstruments = instruments;

      while (txSize == -1 || txSize + 193 > MAX_TX_SIZE) {
        const halvedInstruments = slicedInstruments.slice(
          0,
          Math.trunc(slicedInstruments.length / 2)
        );

        rfqBuilder = await createRfqBuilder(
          convergence,
          {
            ...operation.input,
            keypair,
            instruments: halvedInstruments,
            legSize: expectedLegSize,
          },
          scope
        );

        txSize = await convergence
          .rpc()
          .getTransactionSize(rfqBuilder, [taker, keypair]);

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

      //@ts-ignore
      let addLegsTxSize: number = 0;

      if (slicedInstruments.length < instruments.length) {
        let addLegsSlicedInstruments = instruments.slice(
          slicedInstruments.length
        );

        let addLegsBuilder = await addLegsToRfqBuilder(
          convergence,
          {
            ...operation.input,
            rfq: keypair.publicKey,
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
              rfq: keypair.publicKey,
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

        let x = addLegsSlicedInstruments;

        if (
          addLegsSlicedInstruments.length <
          instruments.slice(slicedInstruments.length).length
        ) {
          while (x.length + slicedInstruments.length < instruments.length) {
            let ins = instruments.slice(
              slicedInstruments.length + x.length, //offset of createRfq legs + addLegs legs
              slicedInstruments.length +
                x.length +
                addLegsSlicedInstruments.length //num of legs successfully passed to addLegs
            );

            //@ts-ignore
            const nextAddLegsBuilder = await addLegsToRfqBuilder(
              convergence,
              {
                ...operation.input,
                rfq: keypair.publicKey,
                instruments: ins,
              },
              scope
            );

            await nextAddLegsBuilder.sendAndConfirm(
              convergence,
              confirmOptions
            );

            x.push(...ins);
          }
        }
      }
      const rfq = await convergence
        .rfqs()
        .findRfqByAddress({ address: keypair.publicKey });
      assertRfq(rfq);

      return { ...output, rfq };
    },
  };
