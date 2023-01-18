import { createCleanUpResponseInstruction } from '@convergence-rfq/rfq';
import { PublicKey, AccountMeta } from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
} from '@solana/spl-token';
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

const Key = 'CleanUpResponseOperation' as const;

/**
 * Cleans up a Response.
 *
 * ```ts
 * await convergence
 *   .rfqs()
 *   .cleanUpResponse({ address };
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

  baseAssetMints: Mint[];

  quoteMint: Mint;
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
    baseAssetMints,
    quoteMint,
  } = params;

  const rfqProgram = convergence.programs().getRfq(programs);
  const protocol = await convergence.protocol().get();

  const anchorRemainingAccounts: AccountMeta[] = [];

  const rfqModel = await convergence.rfqs().findRfqByAddress({ address: rfq });
  const responseModel = await convergence
    .rfqs()
    .findResponseByAddress({ address: response });

  const initializedLegs = responseModel.legPreparationsInitializedBy.length;

  for (let i = 0; i < initializedLegs; i++) {
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
        pubkey: await getAssociatedTokenAddress(
          baseAssetMints[i].address,
          dao,
          undefined,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        ),
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
      pubkey: await getAssociatedTokenAddress(
        quoteMint.address,
        dao,
        undefined,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      ),
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
