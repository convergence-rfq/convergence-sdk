import {
  createPrepareSettlementInstruction,
  AuthoritySide,
} from '@convergence-rfq/rfq';
import {
  PublicKey,
  AccountMeta,
  ComputeBudgetProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
} from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { Convergence } from '../../../Convergence';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
  Signer,
  makeConfirmOptionsFinalizedOnMainnet,
} from '../../../types';
import {
  TransactionBuilder,
  TransactionBuilderOptions,
} from '../../../utils/TransactionBuilder';
import { Rfq } from '../../rfqModule';
import { getOrCreateATAtxBuilder } from '../../../utils/ata';
import { Mint } from '../../tokenModule';
import { InstrumentPdasClient } from '../../instrumentModule';
import { legToBaseAssetMint } from '@/plugins/instrumentModule';
import {
  PrepareAmericanOptionsResult,
  prepareAmericanOptions,
  psyoptionsAmericanInstrumentProgram,
} from '@/plugins/psyoptionsAmericanInstrumentModule';
import {
  prepareEuropeanOptions,
  psyoptionsEuropeanInstrumentProgram,
} from '@/plugins/psyoptionsEuropeanInstrumentModule';

const Key = 'PrepareSettlementOperation' as const;

/**
 * Prepares for settlement.
 *
 * ```ts
 * await convergence
 *   .rfqs()
 *   .prepareSettlement({
 *     rfq: rfq.address,
 *     response: rfqResponse.address,
 *     legAmountToPrepare: 1
 *   });
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const prepareSettlementOperation =
  useOperation<PrepareSettlementOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type PrepareSettlementOperation = Operation<
  typeof Key,
  PrepareSettlementInput,
  PrepareSettlementOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type PrepareSettlementInput = {
  /**
   * The caller to prepare settlement of the Rfq.
   *
   * @defaultValue `convergence.identity()`
   */
  caller?: Signer;

  /**
   * The protocol address.
   * @defaultValue `convergence.protocol().pdas().protocol()`
   */
  protocol?: PublicKey;

  /** The address of the Rfq account. */
  rfq: PublicKey;

  /** The address of the Response account. */
  response: PublicKey;

  /*
   * Args
   */

  /** The number of legs to prepare settlement for. */
  legAmountToPrepare: number;
};

/**
 * @group Operations
 * @category Outputs
 */
export type PrepareSettlementOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const prepareSettlementOperationHandler: OperationHandler<PrepareSettlementOperation> =
  {
    handle: async (
      operation: PrepareSettlementOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<PrepareSettlementOutput> => {
      const {
        response,
        rfq,
        caller = convergence.identity(),
      } = operation.input;

      const rfqModel = await convergence
        .rfqs()
        .findRfqByAddress({ address: rfq });

      const {
        ataTxBuilderArray: additionalAtaTxBuilderArray,
        prepareSettlementTxBuilder,
      } = await prepareSettlementBuilder(
        convergence,
        rfqModel,
        {
          ...operation.input,
        },
        scope
      );

      let ataTxs: Transaction[] = [];
      let mintTxs: Transaction[] = [];
      let prepareOptionsResult: PrepareAmericanOptionsResult = {
        ataTxBuilders: [],
        mintTxBuilders: [],
      };

      if (doesRfqLegContainsPsyoptionsAmerican(rfqModel)) {
        prepareOptionsResult = await prepareAmericanOptions(
          convergence,
          response,
          caller?.publicKey
        );
      }
      if (doesRfqLegContainsPsyoptionsEuropean(rfqModel)) {
        prepareOptionsResult = await prepareEuropeanOptions(
          convergence,
          response,
          caller?.publicKey
        );
      }
      const lastValidBlockHeight = await convergence.rpc().getLatestBlockhash();
      ataTxs = prepareOptionsResult.ataTxBuilders.map((txBuilder) =>
        txBuilder.toTransaction(lastValidBlockHeight)
      );
      mintTxs = prepareOptionsResult.mintTxBuilders.map((txBuilder) =>
        txBuilder.toTransaction(lastValidBlockHeight)
      );
      const additionAtatxs = additionalAtaTxBuilderArray.map((txBuilder) =>
        txBuilder.toTransaction(lastValidBlockHeight)
      );
      const prepareSettlementTx =
        prepareSettlementTxBuilder.toTransaction(lastValidBlockHeight);
      const confirmOptions = makeConfirmOptionsFinalizedOnMainnet(
        convergence,
        scope.confirmOptions
      );
      const [ataSignedTxs, mintSignedTxs, signedAdditionalAtaTxs] =
        await convergence
          .identity()
          .signTransactionMatrix(ataTxs, mintTxs, additionAtatxs);

      if (ataSignedTxs.length > 0) {
        await Promise.all(
          ataSignedTxs.map((signedTx) =>
            convergence
              .rpc()
              .serializeAndSendTransaction(signedTx, lastValidBlockHeight)
          )
        );
      }

      if (signedAdditionalAtaTxs.length > 0) {
        await Promise.all(
          signedAdditionalAtaTxs.map((signedTx) =>
            convergence
              .rpc()
              .serializeAndSendTransaction(signedTx, lastValidBlockHeight)
          )
        );
      }

      if (mintSignedTxs.length > 0) {
        await Promise.all(
          mintSignedTxs.map((signedTx) =>
            convergence
              .rpc()
              .serializeAndSendTransaction(signedTx, lastValidBlockHeight)
          )
        );
      }

      const signedPrepareSettlementTx = await convergence
        .identity()
        .signTransaction(prepareSettlementTx);

      const output = await convergence
        .rpc()
        .serializeAndSendTransaction(
          signedPrepareSettlementTx,
          lastValidBlockHeight,
          confirmOptions
        );

      return {
        response: output,
      };
    },
  };

/**
 * @group Transaction Builders
 * @category Inputs
 */
export type PrepareSettlementBuilderParams = PrepareSettlementInput;

/**
 * Prepares for settlement
 *
 * ```ts
 * const transactionBuilder = convergence
 *   .rfqs()
 *   .builders()
 *   .prepareSettlement({ address });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */

export type PrepareSettlementBuilderResult = {
  ataTxBuilderArray: TransactionBuilder[];
  prepareSettlementTxBuilder: TransactionBuilder;
};
export const prepareSettlementBuilder = async (
  convergence: Convergence,
  rfqModel: Rfq,
  params: PrepareSettlementBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<PrepareSettlementBuilderResult> => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const {
    caller = convergence.identity(),
    rfq,
    response,
    legAmountToPrepare,
  } = params;

  const rfqProgram = convergence.programs().getRfq(programs);

  const responseModel = await convergence
    .rfqs()
    .findResponseByAddress({ address: response });

  const side =
    caller.publicKey.toBase58() == responseModel.maker.toBase58()
      ? AuthoritySide.Maker
      : AuthoritySide.Taker;

  const spotInstrumentProgram = convergence.programs().getSpotInstrument();

  const baseAssetMints: Mint[] = [];

  for (const leg of rfqModel.legs) {
    baseAssetMints.push(await legToBaseAssetMint(convergence, leg));
  }

  const anchorRemainingAccounts: AccountMeta[] = [];

  const spotInstrumentProgramAccount: AccountMeta = {
    pubkey: spotInstrumentProgram.address,
    isSigner: false,
    isWritable: false,
  };

  const systemProgram = convergence.programs().getSystem(programs);

  const quoteEscrowPda = new InstrumentPdasClient(convergence).quoteEscrow({
    response,
    program: spotInstrumentProgram.address,
  });

  const quoteAccounts: AccountMeta[] = [
    {
      pubkey: caller.publicKey,
      isSigner: true,
      isWritable: true,
    },
    {
      pubkey: convergence.tokens().pdas().associatedTokenAccount({
        mint: rfqModel.quoteMint,
        owner: caller.publicKey,
        programs,
      }),
      isSigner: false,
      isWritable: true,
    },
    { pubkey: rfqModel.quoteMint, isSigner: false, isWritable: false },
    {
      pubkey: quoteEscrowPda,
      isSigner: false,
      isWritable: true,
    },
    { pubkey: systemProgram.address, isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
  ];

  anchorRemainingAccounts.push(spotInstrumentProgramAccount, ...quoteAccounts);

  const ataTxBuilderArray: TransactionBuilder[] = [];
  for (let legIndex = 0; legIndex < legAmountToPrepare; legIndex++) {
    const instrumentProgramAccount: AccountMeta = {
      pubkey: rfqModel.legs[legIndex].getProgramId(),
      isSigner: false,
      isWritable: false,
    };

    const instrumentEscrowPda = new InstrumentPdasClient(
      convergence
    ).instrumentEscrow({
      response,
      index: legIndex,
      rfqModel,
    });

    const { ataPubKey, txBuilder } = await getOrCreateATAtxBuilder(
      convergence,
      baseAssetMints[legIndex].address,
      caller.publicKey,
      programs
    );

    if (txBuilder) {
      ataTxBuilderArray.push(txBuilder);
    }

    const legAccounts: AccountMeta[] = [
      // `caller`
      {
        pubkey: caller.publicKey,
        isSigner: true,
        isWritable: true,
      },
      // `caller_token_account`
      {
        pubkey: ataPubKey,
        isSigner: false,
        isWritable: true,
      },
      // `mint`
      {
        pubkey: baseAssetMints[legIndex].address,
        isSigner: false,
        isWritable: false,
      },
      // `escrow`
      {
        pubkey: instrumentEscrowPda,
        isSigner: false,
        isWritable: true,
      },
      { pubkey: systemProgram.address, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ];
    anchorRemainingAccounts.push(instrumentProgramAccount, ...legAccounts);
  }

  const prepareSettlementTxBuilder = TransactionBuilder.make()
    .setFeePayer(payer)
    .add(
      {
        instruction: ComputeBudgetProgram.setComputeUnitLimit({
          units: 1400000,
        }),
        signers: [],
      },
      {
        instruction: createPrepareSettlementInstruction(
          {
            caller: caller.publicKey,
            protocol: convergence.protocol().pdas().protocol(),
            rfq,
            response,
            anchorRemainingAccounts,
          },
          {
            side,
            legAmountToPrepare,
          },
          rfqProgram.address
        ),
        signers: [caller],
        key: 'prepareSettlement',
      }
    );
  return {
    ataTxBuilderArray,
    prepareSettlementTxBuilder,
  };
};

const doesRfqLegContainsPsyoptionsAmerican = (rfq: Rfq) => {
  return rfq.legs.some((leg) =>
    leg.getProgramId().equals(psyoptionsAmericanInstrumentProgram.address)
  );
};

const doesRfqLegContainsPsyoptionsEuropean = (rfq: Rfq) => {
  return rfq.legs.some((leg) =>
    leg.getProgramId().equals(psyoptionsEuropeanInstrumentProgram.address)
  );
};
