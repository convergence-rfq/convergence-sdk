import {
  createCreateRfqInstruction,
  createValidateRfqByPrintTradeProviderInstruction,
} from '@convergence-rfq/rfq';
import { PublicKey } from '@solana/web3.js';
import * as anchor from '@project-serum/anchor';

import { BN } from 'bn.js';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import {
  assertPrintTradeRfq,
  FixedSize,
  PrintTradeRfq,
  toSolitaFixedSize,
} from '../models';
import {
  calculateExpectedLegsHash,
  calculateExpectedLegsSize,
  legsToBaseAssetAccounts,
} from '../helpers';
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
  Signer,
} from '../../../types';
import { Convergence } from '../../../Convergence';
import { OrderType, toSolitaOrderType } from '../models/OrderType';
import { finalizeRfqConstructionBuilder } from './finalizeRfqConstruction';
import {
  PrintTrade,
  serializePrintTradeAsSolitaLeg,
  printTradeToSolitaLeg,
  printTradetoSolitaQuote,
  getPrintTradeValidationAccounts,
} from '@/plugins/printTradeModule';

const Key = 'CreatePrintTradeRfqOperation' as const;

export const createPrintTradeRfqOperation =
  useOperation<CreatePrintTradeRfqOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type CreatePrintTradeRfqOperation = Operation<
  typeof Key,
  CreatePrintTradeRfqInput,
  CreatePrintTradeRfqOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type CreatePrintTradeRfqInput = {
  /**
   * The taker of the Rfq to create.
   *
   * @defaultValue `convergence.identity().publicKey`
   */
  taker?: Signer;

  printTrade: PrintTrade;

  /** The type of order. */
  orderType: OrderType;

  /**
   * The type of the Rfq, specifying whether we fix the number of
   * base assets to be exchanged, the number of quote assets,
   * or neither.
   */
  fixedSize: FixedSize;

  /**
   * Active window (in seconds).
   */
  activeWindow: number;

  /**
   * Settling window (in seconds).
   */
  settlingWindow: number;
};

/**
 * @group Operations
 * @category Outputs
 */
export type CreatePrintTradeRfqOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;

  /** The newly created Rfq. */
  rfq: PrintTradeRfq;
};

/**
 * @group Operations
 * @category Handlers
 */
export const createPrintTradeRfqOperationHandler: OperationHandler<CreatePrintTradeRfqOperation> =
  {
    handle: async (
      operation: CreatePrintTradeRfqOperation,
      convergence: Convergence,
      scope: OperationScope
    ) => {
      const {
        taker = convergence.identity(),
        orderType,
        printTrade,
        fixedSize,
        activeWindow,
        settlingWindow,
      } = operation.input;
      const recentTimestamp = new BN(Math.floor(Date.now() / 1_000));
      const serializedLegs = printTrade
        .getLegs()
        .map((leg) => serializePrintTradeAsSolitaLeg(leg));
      const expectedLegsHash = calculateExpectedLegsHash(serializedLegs);

      const rfqPda = convergence
        .rfqs()
        .pdas()
        .rfq({
          taker: taker.publicKey,
          legsHash: Buffer.from(expectedLegsHash),
          printTradeProvider: printTrade.getPrintTradeProviderProgramId(),
          orderType,
          quoteAsset: printTradetoSolitaQuote(printTrade.getQuote()),
          fixedSize,
          activeWindow,
          settlingWindow,
          recentTimestamp,
        });

      const builder = await createPrintTradeFullFlowRfqBuilder(
        convergence,
        {
          ...operation.input,
          rfq: rfqPda,
          fixedSize,
          activeWindow,
          settlingWindow,
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
      assertPrintTradeRfq(rfq);

      return { ...output, rfq };
    },
  };

/**
 * @group Transaction Builders
 * @category Inputs
 */
export type CreatePrintTradeRfqBuilderParams = CreatePrintTradeRfqInput & {
  rfq: PublicKey;

  expectedLegsHash: Uint8Array;

  recentTimestamp: anchor.BN;
};

export const createPrintTradeFullFlowRfqBuilder = async (
  convergence: Convergence,
  params: CreatePrintTradeRfqBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<TransactionBuilder> => {
  const { payer = convergence.rpc().getDefaultFeePayer() } = options;
  const { rfq, printTrade } = params;

  const createRfqBuilder = await createPrintTradeRfqBuilder(
    convergence,
    params,
    options
  );
  const validatePrintTradeBuilder =
    await validateRfqByPrintTradeProviderBuilder(convergence, params, options);
  const finalizeRfqConstruction = await finalizeRfqConstructionBuilder(
    convergence,
    { ...params, legs: printTrade.getLegs() },
    options
  );

  return TransactionBuilder.make()
    .setContext({
      rfq,
    })
    .setFeePayer(payer)
    .add(
      ...createRfqBuilder.getInstructionsWithSigners(),
      ...validatePrintTradeBuilder.getInstructionsWithSigners(),
      ...finalizeRfqConstruction.getInstructionsWithSigners()
    );
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
export const createPrintTradeRfqBuilder = async (
  convergence: Convergence,
  params: CreatePrintTradeRfqBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<TransactionBuilder> => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;

  const {
    taker = convergence.identity(),
    printTrade,
    rfq,
    orderType,
    fixedSize,
    activeWindow,
    settlingWindow,
    recentTimestamp,
    expectedLegsHash,
  } = params;

  const legs = printTrade.getLegs();
  const solitaLegs = legs.map((leg) => printTradeToSolitaLeg(leg));
  const quote = printTrade.getQuote();
  const serializedLegs = legs.map((leg) => serializePrintTradeAsSolitaLeg(leg));
  const expectedLegsSize = calculateExpectedLegsSize(serializedLegs);

  const systemProgram = convergence.programs().getSystem(programs);
  const rfqProgram = convergence.programs().getRfq(programs);

  const baseAssetAccounts = legsToBaseAssetAccounts(convergence, solitaLegs);

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .setContext({
      rfq,
    })
    .add({
      instruction: createCreateRfqInstruction(
        {
          taker: taker.publicKey,
          protocol: convergence.protocol().pdas().protocol(),
          rfq,
          systemProgram: systemProgram.address,
          anchorRemainingAccounts: [...baseAssetAccounts],
        },
        {
          printTradeProvider: printTrade.getPrintTradeProviderProgramId(),
          expectedLegsSize,
          expectedLegsHash: Array.from(expectedLegsHash),
          legs: solitaLegs,
          orderType: toSolitaOrderType(orderType),
          quoteAsset: printTradetoSolitaQuote(quote),
          fixedSize: toSolitaFixedSize(fixedSize, quote.getDecimals()),
          activeWindow,
          settlingWindow,
          recentTimestamp,
        },
        rfqProgram.address
      ),
      signers: [taker],
      key: 'createRfq',
    });
};

export const validateRfqByPrintTradeProviderBuilder = async (
  convergence: Convergence,
  params: CreatePrintTradeRfqBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<TransactionBuilder> => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;

  const { taker = convergence.identity(), printTrade, rfq } = params;

  const rfqProgram = convergence.programs().getRfq(programs);

  const validationAccounts = await getPrintTradeValidationAccounts(printTrade);

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .setContext({
      rfq,
    })
    .add({
      instruction: createValidateRfqByPrintTradeProviderInstruction(
        {
          taker: taker.publicKey,
          protocol: convergence.protocol().pdas().protocol(),
          rfq,
          anchorRemainingAccounts: validationAccounts,
        },
        rfqProgram.address
      ),
      signers: [taker],
      key: 'validateRfqByPrintTradeProvider',
    });
};
