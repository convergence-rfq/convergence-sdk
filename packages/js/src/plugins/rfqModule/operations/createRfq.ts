import { createCreateRfqInstruction } from '@convergence-rfq/rfq';
import { PublicKey } from '@solana/web3.js';
import * as anchor from '@project-serum/anchor';

import { BN } from 'bn.js';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { assertRfq, FixedSize, Rfq, toSolitaFixedSize } from '../models';
import {
  TransactionBuilder,
  TransactionBuilderOptions,
} from '../../../utils/TransactionBuilder';
import {
  makeConfirmOptionsFinalizedOnMainnet,
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '../../../types';
import { Convergence } from '../../../Convergence';
import { OrderType, toSolitaOrderType } from '../models/OrderType';

const Key = 'CreateRfqOperation' as const;

/**
 * Creates a new Rfq.
 *
 * ```ts
 * const spotInstrument = new SpotInstrument(...);
 * const psyoptionsEuropeanInstrument = new PsyOptionsEuropeanInstrument(...);
 * const quoteAsset = instrumentClient.createQuote(new SpotInstrument(...));
 *
 * const { rfq } = await convergence
 *   .rfqs()
 *   .create({
 *     instruments: [spotInstrument, psyoptionsEuropeanInstrument],
 *     orderType: OrderType.Sell,
 *     fixedSize: { __kind: 'QuoteAsset', quoteAmount: 1 },
 *     activeWindow: 100,
 *     settlingWindow: 100,
 *     quoteAsset,
 *   });
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const createRfqOperation = useOperation<CreateRfqOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type CreateRfqOperation = Operation<
  typeof Key,
  CreateRfqInput,
  CreateRfqOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type CreateRfqInput = {
  /** Mint address for leg asset */
  legAsset: PublicKey;

  /** Mint address for quote asset */
  quoteAsset: PublicKey;

  /** The type of order. */
  orderType: OrderType;

  /**
   * The type of the Rfq, specifying whether we fix the number of
   * base assets to be exchanged, the number of quote assets,
   * or neither.
   */
  fixedSize: FixedSize;

  activeWindow: number;
};

/**
 * @group Operations
 * @category Outputs
 */
export type CreateRfqOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;

  /** The newly created Rfq. */
  rfq: Rfq;
};

/**
 * @group Operations
 * @category Handlers
 */
export const createRfqOperationHandler: OperationHandler<CreateRfqOperation> = {
  handle: async (
    operation: CreateRfqOperation,
    convergence: Convergence,
    scope: OperationScope
  ) => {
    const { legAsset, quoteAsset, orderType, fixedSize, activeWindow } =
      operation.input;
    const recentTimestamp = new BN(Math.floor(Date.now() / 1_000));

    const [{ decimals: legAssetDecimals }, { decimals: quoteAssetDecimals }] =
      await Promise.all([
        convergence.tokens().findMintByAddress({ address: legAsset }),
        convergence.tokens().findMintByAddress({ address: quoteAsset }),
      ]);

    const rfqPda = convergence.rfqs().pdas().rfq({
      taker: convergence.identity().publicKey,
      orderType,
      fixedSize,
      legAsset,
      legAssetDecimals,
      quoteAsset,
      quoteAssetDecimals,
      activeWindow,
      recentTimestamp,
    });

    const builder = await createRfqBuilder(
      convergence,
      {
        ...operation.input,
        rfq: rfqPda,
        fixedSize,
        activeWindow,
        recentTimestamp,
        legAssetDecimals,
        quoteAssetDecimals,
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

    const rfq = await convergence.rfqs().findRfqByAddress({ address: rfqPda });
    assertRfq(rfq);

    return { ...output, rfq };
  },
};

/**
 * @group Transaction Builders
 * @category Inputs
 */
export type CreateRfqBuilderParams = CreateRfqInput & {
  rfq: PublicKey;

  legAssetDecimals: number;

  quoteAssetDecimals: number;

  recentTimestamp: anchor.BN;
};

/**
 * Creates a new Rfq.
 *
 * ```ts
 * const transactionBuilder = await convergence
 *   .rfqs()
 *   .builders()
 *   .create({});
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */

export const createRfqBuilder = async (
  convergence: Convergence,
  params: CreateRfqBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<TransactionBuilder> => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;

  const {
    rfq,
    orderType,
    fixedSize,
    legAsset,
    legAssetDecimals,
    quoteAsset,
    quoteAssetDecimals,
    activeWindow,
    recentTimestamp,
  } = params;

  const systemProgram = convergence.programs().getSystem(programs);
  const rfqProgram = convergence.programs().getRfq(programs);
  const taker = convergence.identity();

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .setContext({
      rfq,
    })
    .add({
      instruction: createCreateRfqInstruction(
        {
          taker: taker.publicKey,
          rfq,
          legMint: legAsset,
          quoteMint: quoteAsset,
          systemProgram: systemProgram.address,
        },
        {
          orderType: toSolitaOrderType(orderType),
          fixedSize: toSolitaFixedSize(
            fixedSize,
            legAssetDecimals,
            quoteAssetDecimals
          ),
          activeWindow,
          recentTimestamp,
        },
        rfqProgram.address
      ),
      signers: [taker],
      key: 'createRfq',
    });
};
