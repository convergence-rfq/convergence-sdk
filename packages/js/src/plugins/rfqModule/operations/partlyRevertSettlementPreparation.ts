import { PublicKey, AccountMeta } from '@solana/web3.js';
import {
  createPartlyRevertSettlementPreparationInstruction,
  AuthoritySide,
} from '@convergence-rfq/rfq';
import {
  TOKEN_PROGRAM_ID,
  // ASSOCIATED_TOKEN_PROGRAM_ID,
  // getAssociatedTokenAddress,
} from '@solana/spl-token';
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

const Key = 'PartlyRevertSettlementPreparationOperation' as const;

/**
 * Partially reverts settlement preparations.
 *
 * ```ts
 * const rfq = await convergence
 *   .rfqs()
 *   .partlyRevertSettlementPreparation({ address };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const partlyRevertSettlementPreparationOperation =
  useOperation<PartlyRevertSettlementPreparationOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type PartlyRevertSettlementPreparationOperation = Operation<
  typeof Key,
  PartlyRevertSettlementPreparationInput,
  PartlyRevertSettlementPreparationOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type PartlyRevertSettlementPreparationInput = {
  /** The protocol address */
  protocol?: PublicKey;
  /** The Rfq address */
  rfq: PublicKey;
  /** The response address */
  response: PublicKey;

  /*
   * Args
   */

  side: AuthoritySide;

  legAmountToRevert: number;
};

/**
 * @group Operations
 * @category Outputs
 */
export type PartlyRevertSettlementPreparationOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const partlyRevertSettlementPreparationOperationHandler: OperationHandler<PartlyRevertSettlementPreparationOperation> =
  {
    handle: async (
      operation: PartlyRevertSettlementPreparationOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<PartlyRevertSettlementPreparationOutput> => {
      const builder = await partlyRevertSettlementPreparationBuilder(
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

export type PartlyRevertSettlementPreparationBuilderParams =
  PartlyRevertSettlementPreparationInput;

enum OptionType {
  CALL = 0,
  PUT = 1,
}

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
export const partlyRevertSettlementPreparationBuilder = async (
  convergence: Convergence,
  params: PartlyRevertSettlementPreparationBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<TransactionBuilder> => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const rfqProgram = convergence.programs().getRfq(programs);

  const { rfq, response, side, legAmountToRevert } = params;

  const protocol = await convergence.protocol().get();

  const anchorRemainingAccounts: AccountMeta[] = [];

  const rfqModel = await convergence.rfqs().findRfqByAddress({ address: rfq });
  const responseModel = await convergence
    .rfqs()
    .findResponseByAddress({ address: response });

  const sidePreparedLegs: number =
    side == AuthoritySide.Taker
      ? parseInt(responseModel.takerPreparedLegs.toString())
      : parseInt(responseModel.makerPreparedLegs.toString());

  const spotInstrumentProgram = convergence.programs().getSpotInstrument();
  const psyoptionsEuropeanProgram = convergence
    .programs()
    .getPsyoptionsEuropeanInstrument();

  const startIndex = sidePreparedLegs - legAmountToRevert;

  // let j = 0;

  for (let i = startIndex; i < sidePreparedLegs; i++) {
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
      spotInstrumentProgram.address.toString()
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

    // j++;
  }

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .add({
      instruction: createPartlyRevertSettlementPreparationInstruction(
        {
          protocol: protocol.address,
          rfq,
          response,
          anchorRemainingAccounts,
        },
        {
          side,
          legAmountToRevert,
        },
        rfqProgram.address
      ),
      signers: [],
      key: 'partlyRevertSettlementPreparation',
    });
};
