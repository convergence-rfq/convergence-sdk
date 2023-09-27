import { PublicKey, AccountMeta } from '@solana/web3.js';
import { createRevertSettlementPreparationInstruction } from '@convergence-rfq/rfq';
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
  /**
   * The protocol address.
   *
   * @defaultValue `convergence.protocol().pdas().protocol()`
   */
  protocol?: PublicKey;

  /** The Rfq address. */
  rfq: PublicKey;

  /** The Response address. */
  response: PublicKey;

  /*
   * Args
   */

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
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const rfqProgram = convergence.programs().getRfq(programs);

  const { rfq, response, side } = params;

  const anchorRemainingAccounts: AccountMeta[] = [];

  const rfqModel = await convergence.rfqs().findRfqByAddress({ address: rfq });
  const responseModel = await convergence
    .rfqs()
    .findResponseByAddress({ address: response });

  const spotInstrumentProgram = convergence.programs().getSpotInstrument();

  const sidePreparedLegs: number =
    side === 'taker'
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
      pubkey: rfqModel.legs[i].getProgramId(),
      isSigner: false,
      isWritable: false,
    };

    const leg = rfqModel.legs[i];

    const exchangeAssetMint = leg.getExchangeAssetMint();

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
            mint: exchangeAssetMint,
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
      instruction: createRevertSettlementPreparationInstruction(
        {
          protocol: convergence.protocol().pdas().protocol(),
          rfq,
          response,
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
