import {
  PublicKey,
  AccountMeta,
  SYSVAR_RENT_PUBKEY,
  ComputeBudgetProgram,
} from '@solana/web3.js';
import {
  createPrepareMoreLegsSettlementInstruction,
  AuthoritySide,
} from '@convergence-rfq/rfq';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { OptionType } from '@mithraic-labs/tokenized-euros';

import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
  Signer,
  makeConfirmOptionsFinalizedOnMainnet,
} from '../../../types';
import { Convergence } from '../../../Convergence';
import { TransactionBuilder, TransactionBuilderOptions } from '../../../utils';
import { Mint } from '../../tokenModule';
import { InstrumentPdasClient } from '../../instrumentModule';
import { SpotInstrument } from '../../spotInstrumentModule';
import { PsyoptionsEuropeanInstrument } from '../../psyoptionsEuropeanInstrumentModule';
import { PsyoptionsAmericanInstrument } from '../../psyoptionsAmericanInstrumentModule';

const Key = 'PrepareMoreLegsSettlementOperation' as const;

/**
 * Prepares more legs settlement
 *
 * ```ts
 * const rfq = await convergence
 *   .rfqs()
 *   .prepareMoreLegsSettlement({
 *     rfq: rfq.address,
 *     response: rfqResponse.address,
 *     legAmountToPrepare: 2,
 *     sidePreparedLegs: 1
 *   });
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const prepareMoreLegsSettlementOperation =
  useOperation<PrepareMoreLegsSettlementOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type PrepareMoreLegsSettlementOperation = Operation<
  typeof Key,
  PrepareMoreLegsSettlementInput,
  PrepareMoreLegsSettlementOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type PrepareMoreLegsSettlementInput = {
  /**
   * The caller of the instruction as a Signer.
   *
   * @defaultValue `convergence.identity()`
   */
  caller?: Signer;

  /**
   * The protocol address.
   * @defaultValue `convergence.protocol().pdas().protocol()`
   */
  protocol?: PublicKey;

  /** The Rfq address. */
  rfq: PublicKey;

  /** The response address. */
  response: PublicKey;

  /*
   * Args
   */

  /** The number of additional legs to prepare settlement for. */
  legAmountToPrepare: number;

  /** Optional number of legs already prepared by the caller of this instruction. */
  sidePreparedLegs?: number;
};

/**
 * @group Operations
 * @category Outputs
 */
export type PrepareMoreLegsSettlementOutput = {
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const prepareMoreLegsSettlementOperationHandler: OperationHandler<PrepareMoreLegsSettlementOperation> =
  {
    handle: async (
      operation: PrepareMoreLegsSettlementOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<PrepareMoreLegsSettlementOutput> => {
      const builder = await prepareMoreLegsSettlementBuilder(
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

export type PrepareMoreLegsSettlementBuilderParams =
  PrepareMoreLegsSettlementInput;

/**
 * Prepares more legs settlement
 *
 * ```ts
 * const transactionBuilder = await convergence
 *   .rfqs()
 *   .builders()
 *   .prepareMoreLegsSettlement();
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const prepareMoreLegsSettlementBuilder = async (
  convergence: Convergence,
  params: PrepareMoreLegsSettlementBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<TransactionBuilder> => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const rfqProgram = convergence.programs().getRfq(programs);
  const systemProgram = convergence.programs().getSystem(programs);

  const {
    caller = convergence.identity(),
    rfq,
    response,
    legAmountToPrepare,
  } = params;

  let { sidePreparedLegs } = params;

  // const protocol = await convergence.protocol().get();

  const anchorRemainingAccounts: AccountMeta[] = [];

  const rfqModel = await convergence.rfqs().findRfqByAddress({ address: rfq });
  const responseModel = await convergence
    .rfqs()
    .findResponseByAddress({ address: response });

  const side =
    caller.publicKey.toBase58() == responseModel.maker.toBase58()
      ? AuthoritySide.Maker
      : AuthoritySide.Taker;

  if (!sidePreparedLegs) {
    sidePreparedLegs =
      side == AuthoritySide.Taker
        ? parseInt(responseModel.takerPreparedLegs.toString())
        : parseInt(responseModel.makerPreparedLegs.toString());
  }

  const spotInstrumentProgram = convergence.programs().getSpotInstrument();
  const psyoptionsEuropeanProgram = convergence
    .programs()
    .getPsyoptionsEuropeanInstrument();
  const psyoptionsAmericanProgram = convergence
    .programs()
    .getPsyoptionsAmericanInstrument();

  for (
    let i = sidePreparedLegs;
    i < sidePreparedLegs + legAmountToPrepare;
    i++
  ) {
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

    const leg = rfqModel.legs[i];

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
      {
        pubkey: caller.publicKey,
        isSigner: true,
        isWritable: true,
      },
      {
        pubkey: convergence.tokens().pdas().associatedTokenAccount({
          mint: baseAssetMint!.address,
          owner: caller.publicKey,
          programs,
        }),
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: baseAssetMint!.address,
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
        instruction: createPrepareMoreLegsSettlementInstruction(
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
        key: 'prepareMoreLegsSettlement',
      }
    );
};
