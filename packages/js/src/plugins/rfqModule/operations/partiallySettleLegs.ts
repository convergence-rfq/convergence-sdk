import { PublicKey, AccountMeta, ComputeBudgetProgram } from '@solana/web3.js';
import {
  createPartiallySettleLegsInstruction,
  Side,
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

const Key = 'PartiallySettleLegsOperation' as const;

/**
 * Partially settles legs of an RFQ
 *
 * ```ts
 * const rfq = await convergence
 *   .rfqs()
 *   .partiallySettleLegs({
 *     rfq: rfq.address,
 *     response: rfqResponse.address,
 *     maker,
 *     taker,
 *     legAmountToSettle: 4
 *   });
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const partiallySettleLegsOperation =
  useOperation<PartiallySettleLegsOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type PartiallySettleLegsOperation = Operation<
  typeof Key,
  PartiallySettleLegsInput,
  PartiallySettleLegsOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type PartiallySettleLegsInput = {
  /** The protocol address.
   * @defaultValue `(await convergence.protocol().get()).address
   */
  protocol?: PublicKey;

  /** The Rfq address. */
  rfq: PublicKey;

  /** The Response address. */
  response: PublicKey;

  /** The Maker's public key address. */
  maker: PublicKey;

  /** The Taker's public key address. */
  taker: PublicKey;

  /*
   * Args
   */

  /** The number of legs to settle. */
  legAmountToSettle: number;
};

/**
 * @group Operations
 * @category Outputs
 */
export type PartiallySettleLegsOutput = {
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const partiallySettleLegsOperationHandler: OperationHandler<PartiallySettleLegsOperation> =
  {
    handle: async (
      operation: PartiallySettleLegsOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<PartiallySettleLegsOutput> => {
      const builder = await partiallySettleLegsBuilder(
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

export type PartiallySettleLegsBuilderParams = PartiallySettleLegsInput;

/**
 * Partially settles legs
 *
 * ```ts
 * const transactionBuilder = await convergence
 *   .rfqs()
 *   .builders()
 *   .partiallySettleLegs();
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const partiallySettleLegsBuilder = async (
  convergence: Convergence,
  params: PartiallySettleLegsBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<TransactionBuilder> => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const rfqProgram = convergence.programs().getRfq(programs);

  const { rfq, response, maker, taker, legAmountToSettle } = params;

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

  const startIndex = parseInt(responseModel.settledLegs.toString());

  for (let i = startIndex; i < startIndex + legAmountToSettle; i++) {
    const leg = rfqModel.legs[i];

    const confirmationSide = responseModel.confirmed?.side;

    let legTakerAmount = -1;

    if (leg.side == Side.Ask) {
      legTakerAmount *= -1;
    }
    if (confirmationSide == Side.Bid) {
      legTakerAmount *= -1;
    }

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
        instruction: createPartiallySettleLegsInstruction(
          {
            protocol: protocol.address,
            rfq,
            response,
            anchorRemainingAccounts,
          },
          {
            legAmountToSettle,
          },
          rfqProgram.address
        ),
        signers: [],
        key: 'partiallySettleLegs',
      }
    );
};
