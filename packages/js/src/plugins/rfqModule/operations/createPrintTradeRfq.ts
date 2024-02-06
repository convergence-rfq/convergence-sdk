import {
  createCreateRfqInstruction,
  createValidateRfqByPrintTradeProviderInstruction,
} from '@convergence-rfq/rfq';
import { Keypair, PublicKey, Transaction } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';

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
  prependWithProviderProgram,
} from '@/plugins/printTradeModule';
import { createWhitelistBuilder } from '@/plugins/whitelistModule';

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

  /** Optional counterparties PubkeyList to create a whitelist. */
  counterParties?: PublicKey[];
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
        counterParties = [],
      } = operation.input;
      const recentTimestamp = new BN(Math.floor(Date.now() / 1_000));
      const serializedLegs = printTrade
        .getLegs()
        .map((leg) => serializePrintTradeAsSolitaLeg(leg));
      const expectedLegsHash = calculateExpectedLegsHash(serializedLegs);
      let createWhitelistTxBuilder: TransactionBuilder | null = null;
      let whitelistAccount = null;
      if (counterParties.length > 0) {
        whitelistAccount = Keypair.generate();
        createWhitelistTxBuilder = await createWhitelistBuilder(
          convergence,
          {
            creator: taker.publicKey,
            whitelist: counterParties,
            whitelistKeypair: whitelistAccount,
          },
          scope
        );
      }
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

      const createPrintTradeRfqBuilder =
        await createPrintTradeFullFlowRfqBuilder(
          convergence,
          {
            ...operation.input,
            rfq: rfqPda,
            fixedSize,
            activeWindow,
            settlingWindow,
            expectedLegsHash,
            recentTimestamp,
            whitelistAccount: whitelistAccount
              ? whitelistAccount.publicKey
              : null,
          },
          scope
        );
      scope.throwIfCanceled();

      const confirmOptions = makeConfirmOptionsFinalizedOnMainnet(
        convergence,
        scope.confirmOptions
      );
      const txs: Transaction[] = [];
      const lastValidBlockHeight = await convergence.rpc().getLatestBlockhash();

      if (whitelistAccount && createWhitelistTxBuilder) {
        const createWhitelistTx =
          createWhitelistTxBuilder.toTransaction(lastValidBlockHeight);
        txs.push(createWhitelistTx);
      }
      txs.push(createPrintTradeRfqBuilder.toTransaction(lastValidBlockHeight));

      const signedTxs = await convergence.identity().signAllTransactions(txs);
      if (whitelistAccount) {
        if (signedTxs.length === 2) {
          const whitelistkeypairSignedCreateWhitelistTx = await convergence
            .rpc()
            .signTransaction(signedTxs[0], [whitelistAccount as Signer]);
          signedTxs[0] = whitelistkeypairSignedCreateWhitelistTx;
        }
      }
      let response: SendAndConfirmTransactionResponse;
      switch (signedTxs.length) {
        case 1:
          response = await convergence
            .rpc()
            .serializeAndSendTransaction(
              signedTxs[0],
              lastValidBlockHeight,
              confirmOptions
            );
          break;
        case 2:
          await convergence
            .rpc()
            .serializeAndSendTransaction(
              signedTxs[0],
              lastValidBlockHeight,
              confirmOptions
            );
          response = await convergence
            .rpc()
            .serializeAndSendTransaction(
              signedTxs[1],
              lastValidBlockHeight,
              confirmOptions
            );
          break;
        default:
          throw new Error('Unexpected number of transactions');
      }

      scope.throwIfCanceled();

      const rfq = await convergence
        .rfqs()
        .findRfqByAddress({ address: rfqPda });
      assertPrintTradeRfq(rfq);

      return { response, rfq };
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

  whitelistAccount: PublicKey | null;
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
    .add(createRfqBuilder, validatePrintTradeBuilder, finalizeRfqConstruction);
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
    whitelistAccount,
  } = params;

  const legs = printTrade.getLegs();
  const solitaLegs = legs.map((leg) => printTradeToSolitaLeg(leg));
  const quote = printTrade.getQuote();
  const serializedLegs = legs.map((leg) => serializePrintTradeAsSolitaLeg(leg));
  const expectedLegsSize = calculateExpectedLegsSize(serializedLegs);

  const systemProgram = convergence.programs().getSystem(programs);
  const rfqProgram = convergence.programs().getRfq(programs);

  const baseAssetAccounts = legsToBaseAssetAccounts(convergence, solitaLegs);
  let whitelistAccountToPass = rfqProgram.address;
  if (whitelistAccount) {
    whitelistAccountToPass = whitelistAccount;
  }
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
          whitelist: whitelistAccountToPass,
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

  const validationAccounts = prependWithProviderProgram(
    printTrade,
    await printTrade.getValidationAccounts()
  );

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
