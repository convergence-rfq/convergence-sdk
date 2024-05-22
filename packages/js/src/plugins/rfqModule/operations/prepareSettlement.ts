import {
  createPrepareEscrowSettlementInstruction,
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
import { EscrowResponse, EscrowRfq, Rfq } from '../../rfqModule';
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
import { InstructionUniquenessTracker } from '@/utils/classes';
import { addComputeBudgetIxsIfNeeded } from '@/utils/helpers';

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
      const ixTracker = new InstructionUniquenessTracker([]);
      const {
        response,
        rfq,
        caller = convergence.identity(),
      } = operation.input;

      const rfqModel = await convergence
        .rfqs()
        .findRfqByAddress({ address: rfq });

      const {
        ataTxBuilderArray: remainingAtaTxBuilders,
        prepareSettlementTxBuilder,
      } = await prepareSettlementBuilder(
        convergence,
        rfqModel,
        {
          ...operation.input,
        },
        scope
      );

      if (rfqModel.model !== 'escrowRfq') {
        throw new Error('Response is not settled as an escrow trade!');
      }

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

      prepareOptionsResult.ataTxBuilders.forEach((txBuilder) => {
        ixTracker.checkedAdd(txBuilder, 'TransactionBuilder');
      });
      const lastValidBlockHeight = await convergence.rpc().getLatestBlockhash();
      ataTxs = prepareOptionsResult.ataTxBuilders.map((txBuilder) =>
        txBuilder.toTransaction(lastValidBlockHeight)
      );
      mintTxs = prepareOptionsResult.mintTxBuilders.map((txBuilder) =>
        txBuilder.toTransaction(lastValidBlockHeight)
      );
      const uniqueRemainingAtaTxBuilders: TransactionBuilder[] = [];
      remainingAtaTxBuilders.forEach((txBuilder) => {
        if (ixTracker.checkedAdd(txBuilder, 'TransactionBuilder')) {
          uniqueRemainingAtaTxBuilders.push(txBuilder);
        }
      });

      const remainingAtaTxs = uniqueRemainingAtaTxBuilders.map((txBuilder) =>
        txBuilder.toTransaction(lastValidBlockHeight)
      );

      const prepareSettlementTx =
        prepareSettlementTxBuilder.toTransaction(lastValidBlockHeight);
      const confirmOptions = makeConfirmOptionsFinalizedOnMainnet(
        convergence,
        scope.confirmOptions
      );
      const [ataSignedTxs, mintSignedTxs, signedRemainingAtaTxs] =
        await convergence
          .identity()
          .signTransactionMatrix(ataTxs, mintTxs, remainingAtaTxs);

      if (ataSignedTxs.length > 0) {
        await Promise.all(
          ataSignedTxs.map((signedTx) =>
            convergence
              .rpc()
              .serializeAndSendTransaction(signedTx, lastValidBlockHeight)
          )
        );
      }

      if (signedRemainingAtaTxs.length > 0) {
        await Promise.all(
          signedRemainingAtaTxs.map((signedTx) =>
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

  if (
    responseModel.model !== 'escrowResponse' ||
    rfqModel.model !== 'escrowRfq'
  ) {
    throw new Error('Response is not settled as an escrow!');
  }

  const side =
    caller.publicKey.toBase58() == responseModel.maker.toBase58()
      ? AuthoritySide.Maker
      : AuthoritySide.Taker;

  const { anchorRemainingAccounts, ataTxBuilderArray } =
    await getEscrowPrepareSettlementRemainingAccounts(
      convergence,
      caller.publicKey,
      rfqModel,
      responseModel,
      legAmountToPrepare
    );

  const prepareSettlementTxBuilder = TransactionBuilder.make()
    .setFeePayer(payer)
    .add({
      instruction: ComputeBudgetProgram.setComputeUnitLimit({
        units: 300000,
      }),
      signers: [],
    })
    .add({
      instruction: createPrepareEscrowSettlementInstruction(
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
    });

  await addComputeBudgetIxsIfNeeded(
    prepareSettlementTxBuilder,
    convergence,
    true
  );
  return {
    ataTxBuilderArray,
    prepareSettlementTxBuilder,
  };
};

export const getEscrowPrepareSettlementRemainingAccounts = async (
  cvg: Convergence,
  caller: PublicKey,
  rfq: EscrowRfq,
  response: EscrowResponse,
  legAmountToPrepare: number
) => {
  const baseAssetMints: Mint[] = [];

  for (const leg of rfq.legs) {
    baseAssetMints.push(await legToBaseAssetMint(cvg, leg));
  }

  const spotInstrumentProgram = cvg.programs().getSpotInstrument();

  const anchorRemainingAccounts: AccountMeta[] = [];

  const spotInstrumentProgramAccount: AccountMeta = {
    pubkey: spotInstrumentProgram.address,
    isSigner: false,
    isWritable: false,
  };

  const systemProgram = cvg.programs().getSystem();

  const quoteEscrowPda = new InstrumentPdasClient(cvg).quoteEscrow({
    response: response.address,
    program: spotInstrumentProgram.address,
  });

  const quoteAccounts: AccountMeta[] = [
    {
      pubkey: caller,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: cvg.tokens().pdas().associatedTokenAccount({
        mint: rfq.quoteMint,
        owner: caller,
      }),
      isSigner: false,
      isWritable: true,
    },
    { pubkey: rfq.quoteMint, isSigner: false, isWritable: false },
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
      pubkey: rfq.legs[legIndex].getProgramId(),
      isSigner: false,
      isWritable: false,
    };

    const instrumentEscrowPda = new InstrumentPdasClient(cvg).instrumentEscrow({
      response: response.address,
      index: legIndex,
      rfqModel: rfq,
    });

    const { ataPubKey, txBuilder } = await getOrCreateATAtxBuilder(
      cvg,
      baseAssetMints[legIndex].address,
      caller
    );

    if (txBuilder) {
      ataTxBuilderArray.push(txBuilder);
    }

    const legAccounts: AccountMeta[] = [
      // `caller`
      {
        pubkey: caller,
        isSigner: false,
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

  return { anchorRemainingAccounts, ataTxBuilderArray };
};

const doesRfqLegContainsPsyoptionsAmerican = (rfq: EscrowRfq) => {
  return rfq.legs.some((leg) =>
    leg.getProgramId().equals(psyoptionsAmericanInstrumentProgram.address)
  );
};

const doesRfqLegContainsPsyoptionsEuropean = (rfq: EscrowRfq) => {
  return rfq.legs.some((leg) =>
    leg.getProgramId().equals(psyoptionsEuropeanInstrumentProgram.address)
  );
};
