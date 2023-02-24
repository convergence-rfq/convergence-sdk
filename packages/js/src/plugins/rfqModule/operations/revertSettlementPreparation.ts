import { PublicKey, AccountMeta } from '@solana/web3.js';
import {
  createRevertSettlementPreparationInstruction,
  AuthoritySide,
} from '@convergence-rfq/rfq';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { OptionType } from '@mithraic-labs/tokenized-euros';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
  makeConfirmOptionsFinalizedOnMainnet,
} from '@/types';
import { Convergence } from '@/Convergence';
import { TransactionBuilder, TransactionBuilderOptions } from '@/utils';
import { Mint } from '@/plugins/tokenModule';
import { InstrumentPdasClient } from '@/plugins/instrumentModule/InstrumentPdasClient';
import { SpotInstrument } from '@/plugins/spotInstrumentModule';
import { PsyoptionsEuropeanInstrument } from '@/plugins/psyoptionsEuropeanInstrumentModule';
import { PsyoptionsAmericanInstrument } from '@/plugins/psyoptionsAmericanInstrumentModule';

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
  /** The protocol address.
   * @defaultValue `(await convergence.protocol().get()).address
   */
  protocol?: PublicKey;

  /** The Rfq address. */
  rfq: PublicKey;

  /** The Response address. */
  response: PublicKey;

  /*
   * Args
   */

  /** The side (Maker or Taker) that is reverting
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
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const rfqProgram = convergence.programs().getRfq(programs);

  const { rfq, response, side } = params;

  // const protocol = await convergence.protocol().get();

  const anchorRemainingAccounts: AccountMeta[] = [];

  const rfqModel = await convergence.rfqs().findRfqByAddress({ address: rfq });
  const responseModel = await convergence
    .rfqs()
    .findResponseByAddress({ address: response });

  const spotInstrumentProgram = convergence.programs().getSpotInstrument();
  const psyoptionsEuropeanProgram = convergence
    .programs()
    .getPsyoptionsEuropeanInstrument();
  const psyoptionsAmericanProgram = convergence
    .programs()
    .getPsyoptionsAmericanInstrument();

  const sidePreparedLegs: number =
    side == AuthoritySide.Taker
      ? parseInt(responseModel.takerPreparedLegs.toString())
      : parseInt(responseModel.makerPreparedLegs.toString());

  for (let i = 0; i < sidePreparedLegs; i++) {
    const instrumentEscrowPda = new InstrumentPdasClient(
      convergence
    ).instrumentEscrow({
      response,
      index: i,
      rfqModel,
    });

    const instrumentProgramAccount: AccountMeta = {
      pubkey: rfqModel.legs[i].instrumentProgram,
      isSigner: false,
      isWritable: false,
    };

    const leg = rfqModel.legs[i];

    let baseAssetMint: Mint;

    if (
      leg.instrumentProgram.toBase58() ===
      psyoptionsEuropeanProgram.address.toBase58()
    ) {
      const instrument = await PsyoptionsEuropeanInstrument.createFromLeg(
        convergence,
        leg
      );

      const euroMetaOptionMint = await convergence.tokens().findMintByAddress({
        address:
          instrument.optionType == OptionType.CALL
            ? instrument.meta.callOptionMint
            : instrument.meta.putOptionMint,
      });

      baseAssetMint = euroMetaOptionMint;
    } else if (
      leg.instrumentProgram.toBase58() ===
      psyoptionsAmericanProgram.address.toBase58()
    ) {
      const instrument = await PsyoptionsAmericanInstrument.createFromLeg(
        convergence,
        leg
      );
      const americanOptionMint = await convergence.tokens().findMintByAddress({
        address: instrument.mint.address,
      });

      baseAssetMint = americanOptionMint;
    } else if (
      leg.instrumentProgram.toBase58() ===
      spotInstrumentProgram.address.toBase58()
    ) {
      const instrument = await SpotInstrument.createFromLeg(convergence, leg);
      const mint = await convergence.tokens().findMintByAddress({
        address: instrument.mint.address,
      });

      baseAssetMint = mint;
    }

    const legAccounts: AccountMeta[] = [
      //`escrow`
      {
        pubkey: instrumentEscrowPda,
        isSigner: false,
        isWritable: true,
      },
      // `receiver_tokens`
      {
        pubkey: convergence
          .tokens()
          .pdas()
          .associatedTokenAccount({
            mint: baseAssetMint!.address,
            owner:
              side == AuthoritySide.Maker
                ? responseModel.maker
                : rfqModel.taker,
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

  const quoteEscrowPda = new InstrumentPdasClient(convergence).quoteEscrow({
    response,
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
      pubkey: convergence
        .tokens()
        .pdas()
        .associatedTokenAccount({
          mint: rfqModel.quoteMint,
          owner:
            side == AuthoritySide.Maker ? responseModel.maker : rfqModel.taker,
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
      instruction: createRevertSettlementPreparationInstruction(
        {
          // protocol: protocol.address,
          protocol: convergence.protocol().pdas().protocol(),
          rfq,
          response,
          anchorRemainingAccounts,
        },
        {
          side,
        },
        rfqProgram.address
      ),
      signers: [],
      key: 'revertSettlementPreparation',
    });
};
