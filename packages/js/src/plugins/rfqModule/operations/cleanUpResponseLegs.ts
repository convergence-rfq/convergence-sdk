import { createCleanUpResponseEscrowLegsInstruction } from '@convergence-rfq/rfq';
import { PublicKey, AccountMeta } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

import { SendAndConfirmTransactionResponse } from '../../rpcModule';
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
import { getOrCreateATA } from '../../../utils/ata';
import { InstrumentPdasClient } from '../../instrumentModule/InstrumentPdasClient';
import { protocolCache } from '../../protocolModule/cache';
import { legToBaseAssetMint } from '@/plugins/instrumentModule';
import { addComputeBudgetIxsIfNeeded } from '@/utils/helpers';

const Key = 'CleanUpResponseLegsOperation' as const;

/**
 * Cleans up legs for a response.
 
 * ```ts
 * await convergence
 *   .rfqs()
 *   .cleanUpResponseLegs({
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
  /**
   * The address of the RFQ account.
   */
  rfq: PublicKey;

  /**
   * The address of the Reponse account.
   */
  response: PublicKey;

  /**
   * The first maker or taker to begin settlement preparation.
   */
  firstToPrepare: PublicKey;

  /**
   * The number of legs to clear.
   */
  legAmountToClear: number;

  /**
   * The protocol address.
   *
   * @defaultValue `convergence.protocol().pdas().protocol()`
   */
  protocol?: PublicKey;
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

      const output = await builder.sendAndConfirm(
        convergence,
        scope.confirmOptions
      );
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
  const { rfq, response, firstToPrepare, legAmountToClear } = params;

  const protocol = await protocolCache.get(convergence);

  const rfqModel = await convergence.rfqs().findRfqByAddress({ address: rfq });
  const responseModel = await convergence
    .rfqs()
    .findResponseByAddress({ address: response });

  if (
    responseModel.model !== 'escrowResponse' ||
    rfqModel.model !== 'escrowRfq'
  ) {
    throw new Error('Response is not settled as an escrow!');
  }

  const initializedLegs = responseModel.legPreparationsInitializedBy.length;
  const anchorRemainingAccounts: AccountMeta[] = [];
  for (let i = initializedLegs - legAmountToClear; i < initializedLegs; i++) {
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

    const leg = rfqModel.legs[i];
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
        pubkey: await getOrCreateATA(
          convergence,
          baseAssetMint!.address,
          protocol.authority
        ),
        isSigner: false,
        isWritable: true,
      },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ];

    anchorRemainingAccounts.push(instrumentProgramAccount, ...legAccounts);
  }

  const txBuilder = TransactionBuilder.make()
    .setFeePayer(payer)
    .add({
      instruction: createCleanUpResponseEscrowLegsInstruction(
        {
          protocol: protocol.address,
          rfq,
          response,
          anchorRemainingAccounts,
        },
        {
          legAmountToClear,
        },
        convergence.programs().getRfq(programs).address
      ),
      signers: [],
      key: 'cleanUpResponseLegs',
    });

  await addComputeBudgetIxsIfNeeded(txBuilder, convergence);
  return txBuilder;
};
