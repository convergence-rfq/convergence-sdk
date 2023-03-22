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
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { OptionType } from '@mithraic-labs/tokenized-euros';

import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { Convergence } from '../../../Convergence';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
  Signer,
  makeConfirmOptionsFinalizedOnMainnet,
} from '../../../types';
import { TransactionBuilder, TransactionBuilderOptions } from '../../../utils';
import { Mint } from '../../tokenModule';
import { InstrumentPdasClient } from '../../instrumentModule';
import { SpotInstrument } from '../../spotInstrumentModule';
import { PsyoptionsEuropeanInstrument } from '../../psyoptionsEuropeanInstrumentModule';
import { PsyoptionsAmericanInstrument } from '../../psyoptionsAmericanInstrumentModule';
import { getOrCreateATA } from '../helpers';

const Key = 'PrepareSettlementOperation' as const;

/**
 * Prepares for settlement.
 *
 * ```ts
 * await convergence
 *   .rfqs()
 *   .prepareSettlement({
 *     rfq: rfq.address,
 *     response: rfqResponse.address,
 *     legAmountToPrepare: 1
 *   });
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
   * The caller to prepare settlement of the Rfq.
   *
   * @defaultValue `convergence.identity()`
   */
  caller?: Signer;

  /**
   * The protocol address.
   * @defaultValue `convergence.protocol().pdas().protocol()`
   */
  protocol?: PublicKey;

  /** The address of the Rfq account. */
  rfq: PublicKey;

  /** The address of the Response account. */
  response: PublicKey;

  /*
   * Args
   */

  /** The number of legs to prepare settlement for. */
  legAmountToPrepare: number;
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
    legAmountToPrepare,
  } = params;

  // const protocol = await convergence.protocol().get();
  const rfqProgram = convergence.programs().getRfq(programs);

  const rfqModel = await convergence.rfqs().findRfqByAddress({ address: rfq });
  const responseModel = await convergence
    .rfqs()
    .findResponseByAddress({ address: response });

  const side =
    caller.publicKey.toBase58() == responseModel.maker.toBase58()
      ? AuthoritySide.Maker
      : AuthoritySide.Taker;

  const spotInstrumentProgram = convergence.programs().getSpotInstrument();
  const psyoptionsEuropeanProgram = convergence
    .programs()
    .getPsyoptionsEuropeanInstrument();
  const psyoptionsAmericanProgram = convergence
    .programs()
    .getPsyoptionsAmericanInstrument();

  const baseAssetMints: Mint[] = [];

  for (const leg of rfqModel.legs) {
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

      baseAssetMints.push(euroMetaOptionMint);
    } else if (
      leg.instrumentProgram.toBase58() ===
      psyoptionsAmericanProgram.address.toBase58()
    ) {
      const instrument = await PsyoptionsAmericanInstrument.createFromLeg(
        convergence,
        leg
      );
      const americanOptionMint = await convergence.tokens().findMintByAddress({
        address: instrument.optionMeta.optionMint,
      });

      baseAssetMints.push(americanOptionMint);
    } else if (
      leg.instrumentProgram.toBase58() ===
      spotInstrumentProgram.address.toBase58()
    ) {
      const instrument = await SpotInstrument.createFromLeg(convergence, leg);
      const mint = await convergence.tokens().findMintByAddress({
        address: instrument.mint.address,
      });

      baseAssetMints.push(mint);
    }
  }

  const anchorRemainingAccounts: AccountMeta[] = [];

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
      pubkey: convergence.tokens().pdas().associatedTokenAccount({
        mint: rfqModel.quoteMint,
        owner: caller.publicKey,
        programs,
      }),
      isSigner: false,
      isWritable: true,
    },
    { pubkey: rfqModel.quoteMint, isSigner: false, isWritable: false },
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

    // const callerTokensPda = convergence.tokens().pdas().associatedTokenAccount({
    //   mint: baseAssetMints[legIndex].address,
    //   owner: caller.publicKey,
    //   programs,
    // });
    // const callerTokensAccount = await convergence
    //   .rpc()
    //   .getAccount(callerTokensPda);

    const legAccounts: AccountMeta[] = [
      // `caller`
      {
        pubkey: caller.publicKey,
        isSigner: true,
        isWritable: true,
      },
      // `caller_tokens`
      {
        pubkey: await getOrCreateATA(
          convergence,
          baseAssetMints[legIndex].address,
          caller.publicKey,
          programs
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
            protocol: convergence.protocol().pdas().protocol(),
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
