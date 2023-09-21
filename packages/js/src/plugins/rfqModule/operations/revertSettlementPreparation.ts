import { PublicKey, AccountMeta } from '@solana/web3.js';
import {
  createRevertEscrowSettlementPreparationInstruction,
  createRevertPrintTradeSettlementPreparationPreparationInstruction,
} from '@convergence-rfq/rfq';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
  makeConfirmOptionsFinalizedOnMainnet,
} from '../../../types';
import { Convergence } from '../../../Convergence';
import {
  TransactionBuilder,
  TransactionBuilderOptions,
} from '../../../utils/TransactionBuilder';
import { InstrumentPdasClient } from '../../instrumentModule';
import { AuthoritySide, toSolitaAuthoritySide } from '../models/AuthoritySide';
import {
  EscrowResponse,
  EscrowRfq,
  PrintTradeResponse,
  PrintTradeRfq,
} from '../models';
import { legToBaseAssetMint } from '@/plugins/instrumentModule';
import { prependWithProviderProgram } from '@/plugins/printTradeModule';

const Key = 'RevertSettlementPreparationOperation' as const;

/**
 * Reverts settlement preparations.
 *
 * ```ts
 * const rfq = await convergence
 *   .rfqs()
 *   .revertSettlementPreparation({ address };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const revertSettlementPreparationOperation =
  useOperation<RevertSettlementPreparationOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type RevertSettlementPreparationOperation = Operation<
  typeof Key,
  RevertSettlementPreparationInput,
  RevertSettlementPreparationOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type RevertSettlementPreparationInput = {
  /** The Response address. */
  response: PublicKey;

  /**
   * The side (Maker or Taker) that is reverting
   * settlement preparation.
   */
  side: AuthoritySide;
};

/**
 * @group Operations
 * @category Outputs
 */
export type RevertSettlementPreparationOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const revertSettlementPreparationOperationHandler: OperationHandler<RevertSettlementPreparationOperation> =
  {
    handle: async (
      operation: RevertSettlementPreparationOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<RevertSettlementPreparationOutput> => {
      const builder = await revertSettlementPreparationBuilder(
        convergence,
        {
          ...operation.input,
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

      return output;
    },
  };

export type RevertSettlementPreparationBuilderParams =
  RevertSettlementPreparationInput;

/**
 * Partially reverts settlement preparations
 *
 * ```ts
 * const transactionBuilder = await convergence
 *   .rfqs()
 *   .builders()
 *   .partlyRevertSettlementPreparation();
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const revertSettlementPreparationBuilder = async (
  convergence: Convergence,
  params: RevertSettlementPreparationBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<TransactionBuilder> => {
  const responseModel = await convergence
    .rfqs()
    .findResponseByAddress({ address: params.response });
  const rfqModel = await convergence
    .rfqs()
    .findRfqByAddress({ address: responseModel.rfq });

  if (
    responseModel.model === 'escrowResponse' &&
    rfqModel.model === 'escrowRfq'
  ) {
    return revertEscrowSettlementPreparationBuilder(
      convergence,
      {
        response: responseModel,
        rfq: rfqModel,
        side: params.side,
      },
      options
    );
  } else if (
    responseModel.model === 'printTradeResponse' &&
    rfqModel.model === 'printTradeRfq'
  ) {
    return revertPrintTradeSettlementPreparationBuilder(
      convergence,
      {
        response: responseModel,
        rfq: rfqModel,
        side: params.side,
      },
      options
    );
  }

  throw new Error('Rfq type does not match with response type!');
};

export type RevertEscrowSettlementPreparationBuilderParams = {
  response: PublicKey | EscrowResponse;
  rfq?: EscrowRfq;
  side: AuthoritySide;
};

export const revertEscrowSettlementPreparationBuilder = async (
  cvg: Convergence,
  params: RevertEscrowSettlementPreparationBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<TransactionBuilder> => {
  const { programs, payer = cvg.rpc().getDefaultFeePayer() } = options;
  const { response, rfq, side } = params;

  const responseModel =
    response instanceof PublicKey
      ? await cvg.rfqs().findResponseByAddress({ address: response })
      : response;
  const rfqModel =
    rfq ?? (await cvg.rfqs().findRfqByAddress({ address: responseModel.rfq }));

  if (
    responseModel.model !== 'escrowResponse' ||
    rfqModel.model !== 'escrowRfq'
  ) {
    throw new Error('Response is not settled as an escrow!');
  }

  const rfqProgram = cvg.programs().getRfq(programs);
  const anchorRemainingAccounts: AccountMeta[] = [];
  const spotInstrumentProgram = cvg.programs().getSpotInstrument();

  const sidePreparedLegs: number =
    side === 'taker'
      ? parseInt(responseModel.takerPreparedLegs.toString())
      : parseInt(responseModel.makerPreparedLegs.toString());

  for (let i = 0; i < sidePreparedLegs; i++) {
    const instrumentEscrowPda = new InstrumentPdasClient(cvg).instrumentEscrow({
      response: responseModel.address,
      index: i,
      rfqModel,
    });

    const instrumentProgramAccount: AccountMeta = {
      pubkey: rfqModel.legs[i].getProgramId(),
      isSigner: false,
      isWritable: false,
    };

    const leg = rfqModel.legs[i];

    const baseAssetMint = await legToBaseAssetMint(cvg, leg);

    const legAccounts: AccountMeta[] = [
      //`escrow`
      {
        pubkey: instrumentEscrowPda,
        isSigner: false,
        isWritable: true,
      },
      // `receiver_tokens`
      {
        pubkey: cvg
          .tokens()
          .pdas()
          .associatedTokenAccount({
            mint: baseAssetMint!.address,
            owner: side === 'maker' ? responseModel.maker : rfqModel.taker,
            programs,
          }),
        isSigner: false,
        isWritable: true,
      },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ];

    anchorRemainingAccounts.push(instrumentProgramAccount, ...legAccounts);
  }

  const spotInstrumentProgramAccount: AccountMeta = {
    pubkey: spotInstrumentProgram.address,
    isSigner: false,
    isWritable: false,
  };

  const quoteEscrowPda = new InstrumentPdasClient(cvg).quoteEscrow({
    response: responseModel.address,
    program: spotInstrumentProgram.address,
  });

  const quoteAccounts: AccountMeta[] = [
    //`escrow`
    {
      pubkey: quoteEscrowPda,
      isSigner: false,
      isWritable: true,
    },
    // `receiver_tokens`
    {
      pubkey: cvg
        .tokens()
        .pdas()
        .associatedTokenAccount({
          mint: rfqModel.quoteMint,
          owner: side === 'maker' ? responseModel.maker : rfqModel.taker,
          programs,
        }),
      isSigner: false,
      isWritable: true,
    },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
  ];

  anchorRemainingAccounts.push(spotInstrumentProgramAccount, ...quoteAccounts);

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .add({
      instruction: createRevertEscrowSettlementPreparationInstruction(
        {
          protocol: cvg.protocol().pdas().protocol(),
          rfq: rfqModel.address,
          response: responseModel.address,
          anchorRemainingAccounts,
        },
        {
          side: toSolitaAuthoritySide(side),
        },
        rfqProgram.address
      ),
      signers: [],
      key: 'revertSettlementPreparation',
    });
};

export type RevertPrintTradeSettlementPreparationBuilderParams = {
  response: PublicKey | PrintTradeResponse;
  rfq?: PrintTradeRfq;
  side: AuthoritySide;
};

export const revertPrintTradeSettlementPreparationBuilder = async (
  cvg: Convergence,
  params: RevertPrintTradeSettlementPreparationBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<TransactionBuilder> => {
  const { programs, payer = cvg.rpc().getDefaultFeePayer() } = options;
  const { response, rfq, side } = params;

  const responseModel =
    response instanceof PublicKey
      ? await cvg.rfqs().findResponseByAddress({ address: response })
      : response;
  const rfqModel =
    rfq ?? (await cvg.rfqs().findRfqByAddress({ address: responseModel.rfq }));

  if (
    responseModel.model !== 'printTradeResponse' ||
    rfqModel.model !== 'printTradeRfq'
  ) {
    throw new Error('Response is not settled as a print trade!');
  }

  const remainingAccounts = prependWithProviderProgram(
    rfqModel.printTrade,
    await rfqModel.printTrade.getRevertPreparationAccounts(
      rfqModel,
      responseModel,
      side
    )
  );

  const rfqProgram = cvg.programs().getRfq(programs);

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .add({
      instruction:
        createRevertPrintTradeSettlementPreparationPreparationInstruction(
          {
            protocol: cvg.protocol().pdas().protocol(),
            rfq: rfqModel.address,
            response: responseModel.address,
            anchorRemainingAccounts: remainingAccounts,
          },
          {
            side: toSolitaAuthoritySide(side),
          },
          rfqProgram.address
        ),
      signers: [],
      key: 'revertSettlementPreparation',
    });
};
