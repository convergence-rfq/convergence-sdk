import {
  createPrepareSettlementInstruction,
  AuthoritySide,
} from '@convergence-rfq/rfq';
import {
  PublicKey,
  AccountMeta,
  ComputeBudgetProgram,
  SYSVAR_RENT_PUBKEY,
} from '@solana/web3.js';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
} from '@solana/spl-token';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { Convergence } from '@/Convergence';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
  Signer,
  makeConfirmOptionsFinalizedOnMainnet,
} from '@/types';
import { TransactionBuilder, TransactionBuilderOptions } from '@/utils';
import { Mint } from '@/plugins/tokenModule';
import { InstrumentPdasClient } from '@/plugins/instrumentModule/InstrumentPdasClient';

const Key = 'PrepareSettlementOperation' as const;

/**
 * Prepares for settlement.
 *
 * ```ts
 * await convergence
 *   .rfqs()
 *   .prepareSettlement({ ... };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const prepareSettlementOperation =
  useOperation<PrepareSettlementOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type PrepareSettlementOperation = Operation<
  typeof Key,
  PrepareSettlementInput,
  PrepareSettlementOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type PrepareSettlementInput = {
  /**
   * The caller to prepare settlement of the Rfq
   *
   * @defaultValue `convergence.identity()`
   */
  caller?: Signer;

  /** The address of the protocol */
  protocol?: PublicKey;

  /** The address of the Rfq account */
  rfq: PublicKey;

  /** The address of the response account */
  response: PublicKey;

  /*
   * Args
   */

  side: AuthoritySide;

  legAmountToPrepare: number;

  quoteMint: Mint;

  baseAssetMints: Mint[];
};

/**
 * @group Operations
 * @category Outputs
 */
export type PrepareSettlementOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const prepareSettlementOperationHandler: OperationHandler<PrepareSettlementOperation> =
  {
    handle: async (
      operation: PrepareSettlementOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<PrepareSettlementOutput> => {
      const builder = await prepareSettlementBuilder(
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
export type PrepareSettlementBuilderParams = PrepareSettlementInput;

/**
 * Prepares for settlement
 *
 * ```ts
 * const transactionBuilder = convergence
 *   .rfqs()
 *   .builders()
 *   .prepareSettlement({ address });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const prepareSettlementBuilder = async (
  convergence: Convergence,
  params: PrepareSettlementBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<TransactionBuilder> => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const {
    caller = convergence.identity(),
    rfq,
    response,
    side,
    legAmountToPrepare,
    quoteMint,
    baseAssetMints,
  } = params;

  const protocol = await convergence.protocol().get();
  const rfqProgram = convergence.programs().getRfq(programs);

  const anchorRemainingAccounts: AccountMeta[] = [];

  const spotInstrumentProgram = convergence.programs().getSpotInstrument();

  const spotInstrumentProgramAccount: AccountMeta = {
    pubkey: spotInstrumentProgram.address,
    isSigner: false,
    isWritable: false,
  };

  const systemProgram = convergence.programs().getSystem(programs);

  const quoteEscrowPda = new InstrumentPdasClient(convergence).quoteEscrow({
    response,
    program: spotInstrumentProgram.address,
  });

  const quoteAccounts: AccountMeta[] = [
    {
      pubkey: caller.publicKey,
      isSigner: true,
      isWritable: true,
    },
    {
      pubkey: await getAssociatedTokenAddress(
        quoteMint.address,
        caller.publicKey,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      ),
      isSigner: false,
      isWritable: true,
    },
    { pubkey: quoteMint.address, isSigner: false, isWritable: false },
    {
      pubkey: quoteEscrowPda,
      isSigner: false,
      isWritable: true,
    },
    { pubkey: systemProgram.address, isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
  ];

  anchorRemainingAccounts.push(spotInstrumentProgramAccount, ...quoteAccounts);

  const rfqModel = await convergence.rfqs().findRfqByAddress({ address: rfq });

  //TODO: extract base asset from base asset index

  for (let legIndex = 0; legIndex < legAmountToPrepare; legIndex++) {
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
      // `caller`
      {
        pubkey: caller.publicKey,
        isSigner: true,
        isWritable: true,
      },
      // `caller_tokens`
      {
        pubkey: await getAssociatedTokenAddress(
          baseAssetMints[legIndex].address, //this mint acct must == mint below
          caller.publicKey,
          undefined,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        ),
        isSigner: false,
        isWritable: true,
      },
      // `mint`
      {
        pubkey: baseAssetMints[legIndex].address,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: instrumentEscrowPda,
        isSigner: false,
        isWritable: true,
      },
      { pubkey: systemProgram.address, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
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
        instruction: createPrepareSettlementInstruction(
          {
            caller: caller.publicKey,
            protocol: protocol.address,
            rfq,
            response,
            anchorRemainingAccounts,
          },
          {
            side,
            legAmountToPrepare,
          },
          rfqProgram.address
        ),
        signers: [caller],
        key: 'prepareSettlement',
      }
    );
};
