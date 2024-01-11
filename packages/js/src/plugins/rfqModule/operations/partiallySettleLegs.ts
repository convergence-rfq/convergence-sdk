import { PublicKey, AccountMeta, ComputeBudgetProgram } from '@solana/web3.js';
import { createPartiallySettleLegsInstruction } from '@convergence-rfq/rfq';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
  makeConfirmOptionsFinalizedOnMainnet,
} from '../../../types';
import { Convergence } from '../../../Convergence';
import {
  TransactionBuilder,
  TransactionBuilderOptions,
} from '../../../utils/TransactionBuilder';
import { InstrumentPdasClient } from '../../instrumentModule';
import { legToBaseAssetMint } from '@/plugins/instrumentModule';
import { TRANSACTION_PRIORITY_FEE_MAP } from '@/constants';

const Key = 'PartiallySettleLegsOperation' as const;

/**
 * Partially settles legs of an RFQ
 *
 * ```ts
 * const rfq = await convergence
 *   .rfqs()
 *   .partiallySettleLegs({
 *     rfq: rfq.address,
 *     response: rfqResponse.address,
 *     maker,
 *     taker,
 *     legAmountToSettle: 4
 *   });
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const partiallySettleLegsOperation =
  useOperation<PartiallySettleLegsOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type PartiallySettleLegsOperation = Operation<
  typeof Key,
  PartiallySettleLegsInput,
  PartiallySettleLegsOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type PartiallySettleLegsInput = {
  /**
   * The protocol address.
   * @defaultValue `convergence.protocol().pdas().protocol()`
   */
  protocol?: PublicKey;

  /** The Rfq address. */
  rfq: PublicKey;

  /** The Response address. */
  response: PublicKey;

  /** The Maker's public key address. */
  maker: PublicKey;

  /** The Taker's public key address. */
  taker: PublicKey;

  /*
   * Args
   */

  /** The number of legs to settle. */
  legAmountToSettle: number;
};

/**
 * @group Operations
 * @category Outputs
 */
export type PartiallySettleLegsOutput = {
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const partiallySettleLegsOperationHandler: OperationHandler<PartiallySettleLegsOperation> =
  {
    handle: async (
      operation: PartiallySettleLegsOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<PartiallySettleLegsOutput> => {
      const builder = await partiallySettleLegsBuilder(
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

export type PartiallySettleLegsBuilderParams = PartiallySettleLegsInput;

/**
 * Partially settles legs
 *
 * ```ts
 * const transactionBuilder = await convergence
 *   .rfqs()
 *   .builders()
 *   .partiallySettleLegs();
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const partiallySettleLegsBuilder = async (
  convergence: Convergence,
  params: PartiallySettleLegsBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<TransactionBuilder> => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const rfqProgram = convergence.programs().getRfq(programs);

  const { rfq, response, maker, taker, legAmountToSettle } = params;

  const anchorRemainingAccounts: AccountMeta[] = [];

  const rfqModel = await convergence.rfqs().findRfqByAddress({ address: rfq });
  const responseModel = await convergence
    .rfqs()
    .findResponseByAddress({ address: response });

  const startIndex = parseInt(responseModel.settledLegs.toString());

  for (let i = startIndex; i < startIndex + legAmountToSettle; i++) {
    const leg = rfqModel.legs[i];
    const { legs } = await convergence.rfqs().getSettlementResult({
      rfq: rfqModel,
      response: responseModel,
    });
    const { receiver } = legs[i];

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

    const baseAssetMint = await legToBaseAssetMint(convergence, leg);

    const legAccounts: AccountMeta[] = [
      //`escrow`
      {
        pubkey: instrumentEscrowPda,
        isSigner: false,
        isWritable: true,
      },
      // `receiver_tokens`
      {
        pubkey: convergence
          .tokens()
          .pdas()
          .associatedTokenAccount({
            mint: baseAssetMint!.address,
            owner: receiver === 'maker' ? maker : taker,
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
      instruction: ComputeBudgetProgram.setComputeUnitLimit({
        units: 1400000,
      }),
      signers: [],
    })
    .addTxPriorityFeeIx(convergence)
    .add({
      instruction: createPartiallySettleLegsInstruction(
        {
          protocol: convergence.protocol().pdas().protocol(),
          rfq,
          response,
          anchorRemainingAccounts,
        },
        {
          legAmountToSettle,
        },
        rfqProgram.address
      ),
      signers: [],
      key: 'partiallySettleLegs',
    });
};
