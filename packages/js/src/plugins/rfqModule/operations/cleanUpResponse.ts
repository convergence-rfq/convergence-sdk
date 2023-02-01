import { createCleanUpResponseInstruction } from '@convergence-rfq/rfq';
import { PublicKey, AccountMeta } from '@solana/web3.js';
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
import { OptionType } from '@mithraic-labs/tokenized-euros';

const Key = 'CleanUpResponseOperation' as const;

/**
 * Cleans up a Response.
 *
 * ```ts
 * 
 * const { rfq } = await convergence.rfqs.create(...);
 * const { rfqResponse } = await convergence
 *                                 .rfqs()
 *                                 .respond({ rfq: rfq.address, ... });
 * 
 * await convergence
 *   .rfqs()
 *   .cleanUpResponse({
 *     dao,
 *     rfq: rfq.address,
 *     response: rfqResponse.address,
 *     firstToPrepare: taker.publicKey
 *   });
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const cleanUpResponseOperation =
  useOperation<CleanUpResponseOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type CleanUpResponseOperation = Operation<
  typeof Key,
  CleanUpResponseInput,
  CleanUpResponseOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type CleanUpResponseInput = {
  /** The Maker of the Response */
  maker: PublicKey;
  /**
   * The address of the protocol
   */
  protocol?: PublicKey;

  dao: PublicKey;
  /** The address of the Rfq account */
  rfq: PublicKey;
  /** The address of the Reponse account */
  response: PublicKey;

  firstToPrepare: PublicKey;
};

/**
 * @group Operations
 * @category Outputs
 */
export type CleanUpResponseOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const cleanUpResponseOperationHandler: OperationHandler<CleanUpResponseOperation> =
  {
    handle: async (
      operation: CleanUpResponseOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<CleanUpResponseOutput> => {
      scope.throwIfCanceled();

      const builder = await cleanUpResponseBuilder(
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

      return { ...output };
    },
  };

/**
 * @group Transaction Builders
 * @category Inputs
 */
export type CleanUpResponseBuilderParams = CleanUpResponseInput;

/**
 * Cleans up an existing Response.
 *
 * ```ts
 * const transactionBuilder = convergence
 *   .rfqs()
 *   .builders()
 *   .cleanUpResponse({ address });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const cleanUpResponseBuilder = async (
  convergence: Convergence,
  params: CleanUpResponseBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<TransactionBuilder> => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const {
    maker = convergence.identity().publicKey,
    rfq,
    response,
    firstToPrepare,
    dao,
  } = params;

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

  const initializedLegs = responseModel.legPreparationsInitializedBy.length;

  const quoteMint: PublicKey = SpotInstrument.deserializeInstrumentData(
    Buffer.from(rfqModel.quoteAsset.instrumentData)
  ).mint;

  for (let i = 0; i < initializedLegs; i++) {
    const leg = rfqModel.legs[i];

    const instrumentProgramAccount: AccountMeta = {
      pubkey: rfqModel.legs[i].instrumentProgram,
      isSigner: false,
      isWritable: false,
    };

    const instrumentEscrowPda = new InstrumentPdasClient(
      convergence
    ).instrumentEscrow({
      response,
      index: i,
      rfqModel,
    });

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
      {
        pubkey: firstToPrepare,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: instrumentEscrowPda,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: convergence.tokens().pdas().associatedTokenAccount({
          mint: baseAssetMint!.address,
          owner: dao,
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
    {
      pubkey: firstToPrepare,
      isSigner: false,
      isWritable: true,
    },
    //`escrow`
    {
      pubkey: quoteEscrowPda,
      isSigner: false,
      isWritable: true,
    },
    // `receiver_tokens`
    {
      pubkey: convergence.tokens().pdas().associatedTokenAccount({
        mint: quoteMint,
        owner: dao,
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
      instruction: createCleanUpResponseInstruction(
        {
          maker,
          protocol: protocol.address,
          rfq,
          response,
          anchorRemainingAccounts,
        },
        rfqProgram.address
      ),
      signers: [],
      key: 'cleanUpResponse',
    });
};
