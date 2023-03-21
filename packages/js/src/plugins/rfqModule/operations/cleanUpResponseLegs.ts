import { createCleanUpResponseLegsInstruction } from '@convergence-rfq/rfq';
import { PublicKey, AccountMeta } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { OptionType } from '@mithraic-labs/tokenized-euros';

import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { Convergence } from '../../../Convergence';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
  makeConfirmOptionsFinalizedOnMainnet,
} from '../../../types';
import { TransactionBuilder, TransactionBuilderOptions } from '../../../utils';
import { Mint } from '../../../plugins/tokenModule';
import { InstrumentPdasClient } from '../../../plugins/instrumentModule/InstrumentPdasClient';
import { SpotInstrument } from '../../../plugins/spotInstrumentModule';
import { PsyoptionsEuropeanInstrument } from '../../../plugins/psyoptionsEuropeanInstrumentModule';
import { PsyoptionsAmericanInstrument } from '../../../plugins/psyoptionsAmericanInstrumentModule';

const Key = 'CleanUpResponseLegsOperation' as const;

/**
 * Cleans up Legs for a Response
 *
 * ```ts
 *
 * const { rfq } = await convergence.rfqs.create(...);
 * const { rfqResponse } = await convergence
 *                                 .rfqs()
 *                                 .respond({ rfq: rfq.address, ... });
 *
 * await convergence
 *   .rfqs()
 *   .cleanUpResponseLegs({
 *     dao,
 *     rfq: rfq.address,
 *     response: rfqResponse.address,
 *     firstToPrepare: maker.publicKey,
 *     legAmountToClear: 5
 *   });
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const cleanUpResponseLegsOperation =
  useOperation<CleanUpResponseLegsOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type CleanUpResponseLegsOperation = Operation<
  typeof Key,
  CleanUpResponseLegsInput,
  CleanUpResponseLegsOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type CleanUpResponseLegsInput = {
  /** The protocol address.
   * @defaultValue `convergence.protocol().pdas().protocol()`
   */
  protocol?: PublicKey;

  /** The address of the DAO. */
  dao: PublicKey;

  /** The address of the Rfq account. */
  rfq: PublicKey;

  /** The address of the Reponse account. */
  response: PublicKey;

  /** The first entity (Maker or Taker) to begin settlement preparation. */
  firstToPrepare: PublicKey;

  /*
   * Args
   */

  /** The number of legs to clear. */
  legAmountToClear: number;
};

/**
 * @group Operations
 * @category Outputs
 */
export type CleanUpResponseLegsOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const cleanUpResponseLegsOperationHandler: OperationHandler<CleanUpResponseLegsOperation> =
  {
    handle: async (
      operation: CleanUpResponseLegsOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<CleanUpResponseLegsOutput> => {
      scope.throwIfCanceled();

      const builder = await cleanUpResponseLegsBuilder(
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
export type CleanUpResponseLegsBuilderParams = CleanUpResponseLegsInput;

/**
 * Cleans up Legs for a Response.
 *
 * ```ts
 * const transactionBuilder = convergence
 *   .rfqs()
 *   .builders()
 *   .cleanUpResponseLegs({ address });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const cleanUpResponseLegsBuilder = async (
  convergence: Convergence,
  params: CleanUpResponseLegsBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<TransactionBuilder> => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const { dao, rfq, response, firstToPrepare, legAmountToClear } = params;

  const rfqProgram = convergence.programs().getRfq(programs);
  const protocol = await convergence.protocol().get();

  const anchorRemainingAccounts: AccountMeta[] = [];

  const rfqModel = await convergence.rfqs().findRfqByAddress({ address: rfq });
  const responseModel = await convergence
    .rfqs()
    .findResponseByAddress({ address: response });

  const initializedLegs = responseModel.legPreparationsInitializedBy.length;

  const spotInstrumentProgram = convergence.programs().getSpotInstrument();
  const psyoptionsEuropeanProgram = convergence
    .programs()
    .getPsyoptionsEuropeanInstrument();
  const psyoptionsAmericanProgram = convergence
    .programs()
    .getPsyoptionsAmericanInstrument();

  for (let i = initializedLegs - legAmountToClear; i < initializedLegs; i++) {
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
      // `first_to_prepare`
      {
        pubkey: firstToPrepare,
        isSigner: false,
        isWritable: true,
      },
      // `escrow`
      {
        pubkey: instrumentEscrowPda,
        isSigner: false,
        isWritable: true,
      },
      // `backup_receiver`
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

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .add({
      instruction: createCleanUpResponseLegsInstruction(
        {
          protocol: protocol.address,
          rfq,
          response,
          anchorRemainingAccounts,
        },
        {
          legAmountToClear,
        },
        rfqProgram.address
      ),
      signers: [],
      key: 'cleanUpResponseLegs',
    });
};
