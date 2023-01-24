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
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
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
// import { OptionType } from '@/index';
import { TransactionBuilder, TransactionBuilderOptions } from '@/utils';
import { Mint } from '@/plugins/tokenModule';
import { InstrumentPdasClient } from '@/plugins/instrumentModule/InstrumentPdasClient';
import { SpotInstrument } from '@/plugins/spotInstrumentModule';
import { PsyoptionsEuropeanInstrument } from '@/plugins/psyoptionsEuropeanInstrumentModule';
import { EuroMeta, instructions } from '@mithraic-labs/tokenized-euros';
const { mintOptions } = instructions;
import { prepareMoreLegsSettlementBuilder } from './prepareMoreLegsSettlement';

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

  euroMeta?: EuroMeta;

  // europeanProgram: anchor.Program<EuroPrimitive>;
  europeanProgram?: any;

  euroMetaKey?: PublicKey;

  mintAmount?: any;
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
      const { caller = convergence.identity(), legAmountToPrepare } =
        operation.input;
      const MAX_TX_SIZE = 1232;

      let builder = await prepareSettlementBuilder(
        convergence,
        {
          ...operation.input,
          createNewTokens: true,
        },
        scope
      );
      let txSize = await convergence
        .rpc()
        .getTransactionSize(builder, [caller]);

      let slicedLegAmount = legAmountToPrepare;

      let prepareMoreLegsBuilder: TransactionBuilder;

      while (txSize + 193 > MAX_TX_SIZE) {
        const legAmt = Math.trunc(slicedLegAmount / 2);

        builder = await prepareSettlementBuilder(
          convergence,
          {
            ...operation.input,
            legAmountToPrepare: legAmt,
            createNewTokens: false,
          },
          scope
        );

        txSize = await convergence.rpc().getTransactionSize(builder, [caller]);

        slicedLegAmount = legAmt;
      }

      if (slicedLegAmount < legAmountToPrepare) {
        let prepareMoreLegsSlicedLegAmount =
          legAmountToPrepare - slicedLegAmount;

        prepareMoreLegsBuilder = await prepareMoreLegsSettlementBuilder(
          convergence,
          {
            ...operation.input,
            legAmountToPrepare: prepareMoreLegsSlicedLegAmount,
            sidePreparedLegs: slicedLegAmount,
          },
          scope
        );
      }

      const confirmOptions = makeConfirmOptionsFinalizedOnMainnet(
        convergence,
        scope.confirmOptions
      );

      const output = await builder.sendAndConfirm(convergence, confirmOptions);
      scope.throwIfCanceled();

      //@ts-ignore
      if (prepareMoreLegsBuilder) {
        await prepareMoreLegsBuilder.sendAndConfirm(
          convergence,
          confirmOptions
        );
        scope.throwIfCanceled();
      }

      return { ...output };
    },
  };

/**
 * @group Transaction Builders
 * @category Inputs
 */
export type PrepareSettlementBuilderParams = PrepareSettlementInput & {
  createNewTokens: boolean;
};

enum OptionType {
  CALL = 0,
  PUT = 1,
}

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
    euroMeta,
    europeanProgram,
    mintAmount,
    createNewTokens,
  } = params;

  const protocol = await convergence.protocol().get();
  const rfqProgram = convergence.programs().getRfq(programs);

  const stableMintToken = convergence.tokens().pdas().associatedTokenAccount({
    mint: quoteMint.address,
    owner: caller.publicKey,
    programs,
  });

  const rfqModel = await convergence.rfqs().findRfqByAddress({ address: rfq });

  const spotInstrumentProgram = convergence.programs().getSpotInstrument();
  const psyoptionsEuropeanProgram = convergence
    .programs()
    .getPsyoptionsEuropeanInstrument();

  let baseAssetMints: Mint[] = [];

  let txBuilder = TransactionBuilder.make().setFeePayer(payer);

  for (const leg of rfqModel.legs) {
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

      baseAssetMints.push(euroMetaOptionMint);

      if (createNewTokens) {
        await convergence.tokens().createToken({
          mint:
            instrument.optionType == OptionType.CALL
              ? instrument.meta.callOptionMint
              : instrument.meta.putOptionMint,
          owner: caller.publicKey,
        });
        await convergence.tokens().createToken({
          mint:
            instrument.optionType == OptionType.CALL
              ? instrument.meta.callWriterMint
              : instrument.meta.putWriterMint,
          owner: caller.publicKey,
        });
      }

      const underlyingMintToken = convergence
        .tokens()
        .pdas()
        .associatedTokenAccount({
          mint: instrument.mint.address,
          owner: caller.publicKey,
          programs,
        });
      const optionDestination = convergence
        .tokens()
        .pdas()
        .associatedTokenAccount({
          mint:
            instrument.optionType == OptionType.CALL
              ? instrument.meta.callOptionMint
              : instrument.meta.putOptionMint,
          owner: caller.publicKey,
          programs,
        });
      const writerDestination = convergence
        .tokens()
        .pdas()
        .associatedTokenAccount({
          mint:
            instrument.optionType == OptionType.CALL
              ? instrument.meta.callWriterMint
              : instrument.meta.putWriterMint,
          owner: caller.publicKey,
          programs,
        });

      const minterCollateralKey =
        instrument.optionType == OptionType.CALL
          ? underlyingMintToken
          : stableMintToken;

      const { instruction } = mintOptions(
        europeanProgram,
        instrument.metaKey,
        euroMeta!,
        minterCollateralKey,
        optionDestination,
        writerDestination,
        mintAmount,
        OptionType.PUT
      );

      instruction.keys[0] = {
        pubkey: caller.publicKey,
        isSigner: true,
        isWritable: false,
      };

      txBuilder.add({
        instruction,
        signers: [caller],
      });

      const confirmOptions = makeConfirmOptionsFinalizedOnMainnet(convergence);

      await txBuilder.sendAndConfirm(convergence, confirmOptions);
    } else if (
      leg.instrumentProgram.toString() ===
      spotInstrumentProgram.address.toString()
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
        mint: quoteMint.address,
        owner: caller.publicKey,
        programs,
      }),
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
      // `caller_tokens` , optionDestination
      {
        pubkey: convergence.tokens().pdas().associatedTokenAccount({
          mint: baseAssetMints[legIndex].address,
          owner: caller.publicKey,
          programs,
        }),
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
