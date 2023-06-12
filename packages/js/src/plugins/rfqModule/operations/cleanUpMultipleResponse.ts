import {
  AuthoritySide,
  createCleanUpResponseInstruction,
} from '@convergence-rfq/rfq';
import { PublicKey, AccountMeta, Transaction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

import { Convergence } from '../../../Convergence';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
  makeConfirmOptionsFinalizedOnMainnet,
} from '../../../types';
import { TransactionBuilder, TransactionBuilderOptions } from '../../../utils';
import { InstrumentPdasClient } from '../../../plugins/instrumentModule/InstrumentPdasClient';
import { legToBaseAssetMint } from '../helpers';

const Key = 'cleanUpMultipleResponsesOperation' as const;

/**
 * Cleans up a Response.
 *
 * ```ts
 *
 * const { rfq } = await convergence.rfqs.create(...);
 * const { rfqResponse } =
 *   await convergence
 *     .rfqs()
 *     .respond({ rfq: rfq.address, ... });
 *
 * await convergence
 *   .rfqs()
 *   .cleanUpMultipleResponses({
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
export const cleanUpMultipleResponsesOperation =
  useOperation<CleanUpMultipleResponsesOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type CleanUpMultipleResponsesOperation = Operation<
  typeof Key,
  CleanUpMultipleResponsesInput,
  CleanUpMultipleResponsesOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type CleanUpMultipleResponsesInput = {
  /** The Maker's public key address. */
  maker: PublicKey;

  /** The protocol address.
   * @defaultValue `convergence.protocol().pdas().protocol()`
   */
  protocol?: PublicKey;

  /** The address of the DAO. */
  dao: PublicKey;

  /** The address of the Reponse account. */
  responses: PublicKey[];
};

/**
 * @group Operations
 * @category Outputs
 */
export type CleanUpMultipleResponsesOutput = {};

/**
 * @group Operations
 * @category Handlers
 */
export const cleanUpMultipleResponsesOperationHandler: OperationHandler<CleanUpMultipleResponsesOperation> =
  {
    handle: async (
      operation: CleanUpMultipleResponsesOperation,
      convergence: Convergence,
      scope: OperationScope
    ) => {
      scope.throwIfCanceled();

      const txArray = await cleanUpMultipleResponsesBuilder(
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
      // const signedTnxs = await convergence
      //   .rpc()
      //   .signAllTransactions(txArray, [convergence.rpc().getDefaultFeePayer()]);
      const signedTnxs = await convergence
        .identity()
        .signAllTransactions(txArray);

      for (const tx of signedTnxs) {
        await convergence.rpc().serializeAndSendTransaction(tx, confirmOptions);
      }
      scope.throwIfCanceled();
    },
  };

/**
 * @group Transaction Builders
 * @category Inputs
 */
export type CleanUpMultipleResponsesBuilderParams =
  CleanUpMultipleResponsesInput;

/**
 * Cleans up an existing Response.
 *
 * ```ts
 * const transactionBuilder = convergence
 *   .rfqs()
 *   .builders()
 *   .cleanUpMultipleResponses({ address });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const cleanUpMultipleResponsesBuilder = async (
  convergence: Convergence,
  params: CleanUpMultipleResponsesBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<Transaction[]> => {
  const txArray: Transaction[] = [];
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const { maker = convergence.identity().publicKey, responses, dao } = params;

  const rfqProgram = convergence.programs().getRfq(programs);

  const anchorRemainingAccounts: AccountMeta[] = [];

  for (const response of responses) {
    const responseModel = await convergence
      .rfqs()
      .findResponseByAddress({ address: response });
    const rfqModel = await convergence
      .rfqs()
      .findRfqByAddress({ address: responseModel.rfq });

    const spotInstrumentProgram = convergence.programs().getSpotInstrument();

    const initializedLegs = responseModel.legPreparationsInitializedBy.length;

    for (let i = 0; i < initializedLegs; i++) {
      const leg = rfqModel.legs[i];
      const firstToPrepare =
        responseModel.legPreparationsInitializedBy[0] === AuthoritySide.Maker
          ? responseModel.maker
          : rfqModel.taker;
      const instrumentProgramAccount: AccountMeta = {
        pubkey: rfqModel.legs[i].getProgramId(),
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

      const baseAssetMint = await legToBaseAssetMint(convergence, leg);

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
    const firstToPrepare =
      responseModel.legPreparationsInitializedBy[0] === AuthoritySide.Maker
        ? responseModel.maker
        : rfqModel.taker;
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
          mint: rfqModel.quoteMint,
          owner: dao,
          programs,
        }),
        isSigner: false,
        isWritable: true,
      },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ];

    anchorRemainingAccounts.push(
      spotInstrumentProgramAccount,
      ...quoteAccounts
    );

    const txBuilder = TransactionBuilder.make()
      .setFeePayer(payer)
      .add({
        instruction: createCleanUpResponseInstruction(
          {
            maker,
            protocol: convergence.protocol().pdas().protocol(),
            rfq: responseModel.rfq,
            response,
            anchorRemainingAccounts,
          },
          rfqProgram.address
        ),
        signers: [],
        key: 'cleanUpMultipleResponses',
      });
    const blockHashWithBlockHeight = await convergence
      .rpc()
      .getLatestBlockhash();
    const tx = txBuilder.toTransaction(blockHashWithBlockHeight);
    txArray.push(tx);
  }
  return txArray;
};
