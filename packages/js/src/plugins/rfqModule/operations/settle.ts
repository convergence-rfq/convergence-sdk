import { createSettleInstruction, Side } from '@convergence-rfq/rfq';
import { PublicKey, AccountMeta, ComputeBudgetProgram } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { Convergence } from '@/Convergence';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
  makeConfirmOptionsFinalizedOnMainnet,
} from '@/types';
import { TransactionBuilder, TransactionBuilderOptions } from '@/utils';
import { Mint } from '@/plugins/tokenModule';
import { InstrumentPdasClient } from '@/plugins/instrumentModule/InstrumentPdasClient';
import { SpotInstrument } from '@/plugins/spotInstrumentModule';
import { PsyoptionsEuropeanInstrument } from '@/plugins/psyoptionsEuropeanInstrumentModule';
import { PsyoptionsAmericanInstrument } from '@/plugins/psyoptionsAmericanInstrumentModule';
import { partiallySettleLegsBuilder } from './partiallySettleLegs';
import { OptionType } from '@mithraic-labs/tokenized-euros';

const Key = 'SettleOperation' as const;

/**
 * Settles.
 *
 * ```ts
 * await convergence
 *   .rfqs()
 *   .settle({ address };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const settleOperation = useOperation<SettleOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type SettleOperation = Operation<typeof Key, SettleInput, SettleOutput>;

/**
 * @group Operations
 * @category Inputs
 */
export type SettleInput = {
  maker: PublicKey;

  taker: PublicKey;
  /** The address of the protocol account. */
  protocol?: PublicKey;
  /** The address of the Rfq account. */
  rfq: PublicKey;
  /** The address of the Response account. */
  response: PublicKey;

  quoteMint: Mint;

  startIndex?: number;
};

/**
 * @group Operations
 * @category Outputs
 */
export type SettleOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const settleOperationHandler: OperationHandler<SettleOperation> = {
  handle: async (
    operation: SettleOperation,
    convergence: Convergence,
    scope: OperationScope
  ): Promise<SettleOutput> => {
    const MAX_TX_SIZE = 1232;
    //@ts-ignore
    const { startIndex, response, rfq } = operation.input;

    let builder = await settleBuilder(
      convergence,
      {
        ...operation.input,
        // startIndex,
      },
      scope
    );
    scope.throwIfCanceled();

    let txSize = await convergence.rpc().getTransactionSize(builder, []);

    const rfqModel = await convergence
      .rfqs()
      .findRfqByAddress({ address: rfq });

    let slicedIdx = rfqModel.legs.length;

    while (txSize + 193 > MAX_TX_SIZE) {
      const idx = Math.trunc(slicedIdx / 2);

      builder = await settleBuilder(
        convergence,
        {
          ...operation.input,
          startIndex: idx,
        },
        scope
      );

      txSize = await convergence.rpc().getTransactionSize(builder, []);

      slicedIdx = idx;
    }
    let partiallySettleBuilder: TransactionBuilder;

    if (slicedIdx < rfqModel.legs.length) {
      partiallySettleBuilder = await partiallySettleLegsBuilder(
        convergence,
        {
          ...operation.input,
          legAmountToSettle: slicedIdx,
        },
        scope
      );
    }

    const confirmOptions = makeConfirmOptionsFinalizedOnMainnet(
      convergence,
      scope.confirmOptions
    );
    //@ts-ignore
    if (partiallySettleBuilder) {
      await partiallySettleBuilder.sendAndConfirm(convergence, confirmOptions);
    }

    const output = await builder.sendAndConfirm(convergence, confirmOptions);
    scope.throwIfCanceled();

    return { ...output };
  },
};

/**
 * @group Transaction Builders
 * @category Inputs
 */
export type SettleBuilderParams = SettleInput;

/**
 * Settles
 *
 * ```ts
 * const transactionBuilder = convergence
 *   .rfqs()
 *   .builders()
 *   .settle({ address });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const settleBuilder = async (
  convergence: Convergence,
  params: SettleBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<TransactionBuilder> => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const { rfq, response, quoteMint, maker, taker } = params;

  let { startIndex } = params;

  const rfqProgram = convergence.programs().getRfq(programs);
  const protocol = await convergence.protocol().get();

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

  if (!startIndex) {
    startIndex = parseInt(responseModel.settledLegs.toString());
  }

  for (let legIndex = startIndex; legIndex < rfqModel.legs.length; legIndex++) {
    const leg = rfqModel.legs[legIndex];
    const confirmationSide = responseModel.confirmed?.side;

    let legTakerAmount = -1;

    if (leg.side == Side.Ask) {
      legTakerAmount *= -1;
    }
    if (confirmationSide == Side.Bid) {
      legTakerAmount *= -1;
    }

    let baseAssetMint: Mint;

    if (
      leg.instrumentProgram.toString() ===
      psyoptionsEuropeanProgram.address.toString()
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
      leg.instrumentProgram.toString() ===
      psyoptionsAmericanProgram.address.toString()
    ) {
      const instrument = await PsyoptionsAmericanInstrument.createFromLeg(
        convergence,
        leg
      );
      const mint = await convergence.tokens().findMintByAddress({
        address: instrument.mint.address,
      });

      baseAssetMint = mint;
    } else if (
      leg.instrumentProgram.toString() ===
      spotInstrumentProgram.address.toString()
    ) {
      const instrument = await SpotInstrument.createFromLeg(convergence, leg);
      const mint = await convergence.tokens().findMintByAddress({
        address: instrument.mint.address,
      });

      baseAssetMint = mint;
    }

    const instrumentProgramAccount: AccountMeta = {
      pubkey: rfqModel.legs[legIndex].instrumentProgram,
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
            owner: legTakerAmount > 0 ? maker : taker,
            programs,
          }),
        isSigner: false,
        isWritable: true,
      },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ];

    anchorRemainingAccounts.push(instrumentProgramAccount, ...legAccounts);
  }

  const confirmationSide = responseModel.confirmed?.side;

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
          mint: quoteMint.address,
          owner:
            rfqModel.fixedSize.__kind == 'QuoteAsset' &&
            confirmationSide == Side.Ask
              ? maker
              : taker,
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
    .add(
      {
        instruction: ComputeBudgetProgram.setComputeUnitLimit({
          units: 1400000,
        }),
        signers: [],
      },
      {
        instruction: createSettleInstruction(
          {
            protocol: protocol.address,
            rfq,
            response,
            anchorRemainingAccounts,
          },
          rfqProgram.address
        ),
        signers: [],
        key: 'settle',
      }
    );
};
