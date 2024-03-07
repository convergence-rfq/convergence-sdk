import { createCleanUpResponseInstruction } from '@convergence-rfq/rfq';
import { PublicKey, AccountMeta } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

import { Convergence } from '../../../Convergence';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '../../../types';
import { TransactionBuilder, TransactionBuilderOptions } from '../../../utils';
import { InstrumentPdasClient } from '../../instrumentModule/InstrumentPdasClient';
import {
  EscrowResponse,
  EscrowRfq,
  PrintTradeResponse,
  PrintTradeRfq,
} from '../models';
import { legToBaseAssetMint } from '@/plugins/instrumentModule';
import { SendAndConfirmTransactionResponse } from '@/plugins/rpcModule';
import { prependWithProviderProgram } from '@/plugins/printTradeModule';

const Key = 'cleanUpResponseOperation' as const;

/**
 * Cleans up Rfq response.
 *
 * ```ts
 * await convergence
 *   .rfqs()
 *   .cleanUpResponse({
 *     rfq: <publicKey>,
 *     response: <publicKey>,
 *     firstToPrepare: <publicKey>
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
  /**
   * The address of the reponse accounts.
   */
  response: PublicKey;
};

/**
 * @group Operations
 * @category Outputs
 */
export type CleanUpResponseOutput = {
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
    ) => {
      const builder = await cleanUpResponseBuilder(
        convergence,
        {
          ...operation.input,
        },
        scope
      );
      const output = await builder.sendAndConfirm(
        convergence,
        scope.confirmOptions
      );
      scope.throwIfCanceled();

      return output;
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
 *   .cleanUpResponses({ responses: [<address>, <address>] });
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
    return cleanUpEscrowResponseBuilder(
      convergence,
      {
        response: responseModel,
        rfq: rfqModel,
      },
      options
    );
  } else if (
    responseModel.model === 'printTradeResponse' &&
    rfqModel.model === 'printTradeRfq'
  ) {
    return cleanUpPrintTradeResponseBuilder(
      convergence,
      {
        response: responseModel,
        rfq: rfqModel,
      },
      options
    );
  }

  throw new Error('Rfq type does not match with response type!');
};

export type CleanUpEscrowResponseBuilderParams = {
  response: PublicKey | EscrowResponse;
  rfq?: EscrowRfq;
};

export const cleanUpEscrowResponseBuilder = async (
  convergence: Convergence,
  params: CleanUpEscrowResponseBuilderParams,
  options: TransactionBuilderOptions = {}
) => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const { response, rfq } = params;

  const responseModel =
    response instanceof PublicKey
      ? await convergence.rfqs().findResponseByAddress({ address: response })
      : response;
  const rfqModel =
    rfq ??
    (await convergence.rfqs().findRfqByAddress({ address: responseModel.rfq }));

  if (
    responseModel.model !== 'escrowResponse' ||
    rfqModel.model !== 'escrowRfq'
  ) {
    throw new Error('Response is not settled as an escrow!');
  }

  const dao = convergence.identity().publicKey;
  const rfqProgram = convergence.programs().getRfq(programs);
  const anchorRemainingAccounts: AccountMeta[] = [];

  for (let i = 0; i < responseModel.legPreparationsInitializedBy.length; i++) {
    const leg = rfqModel.legs[i];
    const firstToPrepare =
      responseModel.legPreparationsInitializedBy[0] === 'maker'
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
      rfqModel,
      response: responseModel.address,
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
    response: responseModel.address,
    program: spotInstrumentProgram.address,
  });
  const firstToPrepare =
    responseModel.legPreparationsInitializedBy[0] === 'maker'
      ? responseModel.maker
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

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .addTxPriorityFeeIx(convergence)
    .add({
      instruction: createCleanUpResponseInstruction(
        {
          maker: responseModel.maker,
          protocol: convergence.protocol().pdas().protocol(),
          rfq: responseModel.rfq,
          response: responseModel.address,
          anchorRemainingAccounts,
        },
        rfqProgram.address
      ),
      signers: [],
      key: 'cleanUpResponses',
    });
};

export type CleanUpPrintTradeResponseBuilderParams = {
  response: PublicKey | PrintTradeResponse;
  rfq?: PrintTradeRfq;
};

export const cleanUpPrintTradeResponseBuilder = async (
  convergence: Convergence,
  params: CleanUpPrintTradeResponseBuilderParams,
  options: TransactionBuilderOptions = {}
) => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const { response, rfq } = params;

  const responseModel =
    response instanceof PublicKey
      ? await convergence.rfqs().findResponseByAddress({ address: response })
      : response;
  const rfqModel =
    rfq ??
    (await convergence.rfqs().findRfqByAddress({ address: responseModel.rfq }));

  if (
    responseModel.model !== 'printTradeResponse' ||
    rfqModel.model !== 'printTradeRfq'
  ) {
    throw new Error('Response is not settled as a print trade!');
  }

  const rfqProgram = convergence.programs().getRfq(programs);
  const remainingAccounts = prependWithProviderProgram(
    rfqModel.printTrade,
    await rfqModel.printTrade.getCleanUpAccounts(rfqModel, responseModel)
  );

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .add({
      instruction: createCleanUpResponseInstruction(
        {
          maker: responseModel.maker,
          protocol: convergence.protocol().pdas().protocol(),
          rfq: responseModel.rfq,
          response: responseModel.address,
          anchorRemainingAccounts: remainingAccounts,
        },
        rfqProgram.address
      ),
      signers: [],
      key: 'cleanUpResponses',
    });
};
