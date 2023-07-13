import { createCleanUpResponseInstruction } from '@convergence-rfq/rfq';
import { PublicKey, AccountMeta, Transaction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

import { Convergence } from '../../../Convergence';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '../../../types';
import {
  TransactionBuilder,
  TransactionBuilderOptions,
} from '../../../utils/TransactionBuilder';
import { InstrumentPdasClient } from '../../instrumentModule/InstrumentPdasClient';
import { Response, assertResponse } from '../models/Response';
import { legToBaseAssetMint } from '@/plugins/instrumentModule';
import { SendAndConfirmTransactionResponse } from '@/plugins';

const Key = 'cleanUpResponsesOperation' as const;

/**
 * Cleans up RFQ responses.
 *
 * ```ts
 * await convergence
 *   .rfqs()
 *   .cleanUpResponses({
 *     rfq: rfq.address,
 *     responses: [<address>],
 *     firstToPrepare: taker.publicKey
 *   });
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const cleanUpResponsesOperation =
  useOperation<CleanUpResponsesOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type CleanUpResponsesOperation = Operation<
  typeof Key,
  CleanUpResponsesInput,
  CleanUpResponsesOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type CleanUpResponsesInput = {
  /**
   * The maker public key address.
   */
  maker: PublicKey;

  /**
   * The address of the reponse accounts.
   */
  responses: PublicKey[] | Response[];

  /**
   * The protocol address.
   *
   * @defaultValue `convergence.protocol().pdas().protocol()`
   */
  protocol?: PublicKey;

  /**
   * The address of the DAO.
   */
  dao?: PublicKey;
};

/**
 * @group Operations
 * @category Outputs
 */
export type CleanUpResponsesOutput = {
  responses: SendAndConfirmTransactionResponse[];
};

/**
 * @group Operations
 * @category Handlers
 */
export const cleanUpResponsesOperationHandler: OperationHandler<CleanUpResponsesOperation> =
  {
    handle: async (
      operation: CleanUpResponsesOperation,
      convergence: Convergence,
      scope: OperationScope
    ) => {
      scope.throwIfCanceled();

      const txArray = await cleanUpResponsesBuilder(
        convergence,
        {
          ...operation.input,
        },
        scope
      );
      scope.throwIfCanceled();

      const signedTxs = await convergence
        .identity()
        .signAllTransactions(txArray);

      const responses = await Promise.all(
        signedTxs.map((signedTx) =>
          convergence
            .rpc()
            .serializeAndSendTransaction(signedTx, scope.confirmOptions)
        )
      );
      scope.throwIfCanceled();

      return { responses };
    },
  };

/**
 * @group Transaction Builders
 * @category Inputs
 */
export type CleanUpResponsesBuilderParams = CleanUpResponsesInput;

/**
 * Cleans up an existing Response.
 *
 * ```ts
 * const transactionBuilder = convergence
 *   .rfqs()
 *   .builders()
 *   .cleanUpResponses({ responses: [<address>, <address>] });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const cleanUpResponsesBuilder = async (
  convergence: Convergence,
  params: CleanUpResponsesBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<Transaction[]> => {
  const txArray: Transaction[] = [];
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const {
    responses,
    maker = convergence.identity().publicKey,
    dao = convergence.identity().publicKey,
  } = params;

  const rfqProgram = convergence.programs().getRfq(programs);
  const anchorRemainingAccounts: AccountMeta[] = [];

  for (let response of responses) {
    if (response instanceof PublicKey) {
      response = await convergence
        .rfqs()
        .findResponseByAddress({ address: response });
    }

    assertResponse(response);

    const rfqModel = await convergence
      .rfqs()
      .findRfqByAddress({ address: response.rfq });

    for (let i = 0; i < response.legPreparationsInitializedBy.length; i++) {
      const leg = rfqModel.legs[i];
      const firstToPrepare =
        response.legPreparationsInitializedBy[0] === 'maker'
          ? response.maker
          : rfqModel.taker;
      const instrumentProgramAccount: AccountMeta = {
        pubkey: rfqModel.legs[i].getProgramId(),
        isSigner: false,
        isWritable: false,
      };

      const instrumentEscrowPda = new InstrumentPdasClient(
        convergence
      ).instrumentEscrow({
        rfqModel,
        response: response.address,
        index: i,
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

    const spotInstrumentProgram = convergence.programs().getSpotInstrument();
    const spotInstrumentProgramAccount: AccountMeta = {
      pubkey: spotInstrumentProgram.address,
      isSigner: false,
      isWritable: false,
    };
    const quoteEscrowPda = new InstrumentPdasClient(convergence).quoteEscrow({
      response: response.address,
      program: spotInstrumentProgram.address,
    });
    const firstToPrepare =
      response.legPreparationsInitializedBy[0] === 'maker'
        ? response.maker
        : rfqModel.taker;

    anchorRemainingAccounts.push(
      spotInstrumentProgramAccount,
      {
        pubkey: firstToPrepare,
        isSigner: false,
        isWritable: true,
      },
      // Escrow
      {
        pubkey: quoteEscrowPda,
        isSigner: false,
        isWritable: true,
      },
      // Receiver
      {
        pubkey: convergence.tokens().pdas().associatedTokenAccount({
          mint: rfqModel.quoteMint,
          owner: dao,
          programs,
        }),
        isSigner: false,
        isWritable: true,
      },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }
    );

    const txBuilder = TransactionBuilder.make()
      .setFeePayer(payer)
      .add({
        instruction: createCleanUpResponseInstruction(
          {
            maker,
            protocol: convergence.protocol().pdas().protocol(),
            rfq: response.rfq,
            response: response.address,
            anchorRemainingAccounts,
          },
          rfqProgram.address
        ),
        signers: [],
        key: 'cleanUpResponses',
      });
    const blockHashWithBlockHeight = await convergence
      .rpc()
      .getLatestBlockhash();
    const tx = txBuilder.toTransaction(blockHashWithBlockHeight);
    txArray.push(tx);
  }
  return txArray;
};
