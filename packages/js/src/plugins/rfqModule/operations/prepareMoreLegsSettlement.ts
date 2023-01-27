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
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
  Signer,
  makeConfirmOptionsFinalizedOnMainnet,
} from '@/types';
import { Convergence } from '@/Convergence';
import { TransactionBuilder, TransactionBuilderOptions } from '@/utils';
import { Mint } from '@/plugins/tokenModule';
import { InstrumentPdasClient } from '@/plugins/instrumentModule/InstrumentPdasClient';
import { SpotInstrument } from '@/plugins/spotInstrumentModule';
import { PsyoptionsEuropeanInstrument } from '@/plugins/psyoptionsEuropeanInstrumentModule';
import { PsyoptionsAmericanInstrument } from '@/plugins/psyoptionsAmericanInstrumentModule';
import { OptionType } from '@mithraic-labs/tokenized-euros';

const Key = 'PrepareMoreLegsSettlementOperation' as const;

/**
 * Prepares more legs settlement
 *
 * ```ts
 * const rfq = await convergence
 *   .rfqs()
 *   .prepareMoreLegsSettlement({ address };
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
   * The owner of the Rfq as a Signer.
   *
   * @defaultValue `convergence.identity()`
   */
  caller?: Signer;
  /** The protocol address */
  protocol?: PublicKey;
  /** The Rfq address */
  rfq: PublicKey;
  /** The response address */
  response: PublicKey;

  /*
   * Args
   */

  // side: AuthoritySide;

  legAmountToPrepare: number;

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
      const { sidePreparedLegs } = operation.input;

      const builder = await prepareMoreLegsSettlementBuilder(
        convergence,
        {
          ...operation.input,
          sidePreparedLegs,
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
    // side,
    legAmountToPrepare,
  } = params;

  let { sidePreparedLegs } = params;

  const protocol = await convergence.protocol().get();

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
      psyoptionsAmericanProgram.address.toString()
    ) {
      const instrument = await PsyoptionsAmericanInstrument.createFromLeg(
        convergence,
        leg
      );
      const mint = await convergence.tokens().findMintByAddress({
        address: instrument.mint.address,
      });

      baseAssetMint = mint;
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
        key: 'prepareMoreLegsSettlement',
      }
    );
};
