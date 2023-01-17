import { PublicKey, AccountMeta } from '@solana/web3.js';
import {
  createPartiallySettleLegsInstruction,
  Side,
} from '@convergence-rfq/rfq';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
  makeConfirmOptionsFinalizedOnMainnet,
} from '@/types';
import { Convergence } from '@/Convergence';
import { TransactionBuilder, TransactionBuilderOptions } from '@/utils';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
} from '@solana/spl-token';
import { Mint } from '@/plugins/tokenModule';

const Key = 'PartiallySettleLegsOperation' as const;

/**
 * Partially settles legs
 *
 * ```ts
 * const rfq = await convergence
 *   .rfqs()
 *   .partiallySettleLegs({ address };
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
  /** The protocol address */
  protocol?: PublicKey;
  /** The Rfq address */
  rfq: PublicKey;
  /** The response address */
  response: PublicKey;

  maker: PublicKey;

  taker: PublicKey;

  baseAssetMints: Mint[];

  /*
   * Args
   */

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

  const { rfq, response, maker, taker, baseAssetMints, legAmountToSettle } =
    params;

  const protocol = await convergence.protocol().get();

  const anchorRemainingAccounts: AccountMeta[] = [];

  const rfqModel = await convergence.rfqs().findRfqByAddress({ address: rfq });
  const responseModel = await convergence
    .rfqs()
    .findResponseByAddress({ address: response });

  const startIndex = parseInt(responseModel.settledLegs.toString());

  for (let i = startIndex; i < startIndex + legAmountToSettle; i++) {
    const leg = rfqModel.legs[i];
    const confirmationSide = responseModel.confirmed?.side;

    let legTakerAmount = -1;

    if (leg.side == Side.Ask) {
      legTakerAmount *= -1;
    }
    if (confirmationSide == Side.Bid) {
      legTakerAmount *= -1;
    }

    const instrumentProgramAccount: AccountMeta = {
      pubkey: rfqModel.legs[i].instrumentProgram,
      isSigner: false,
      isWritable: false,
    };

    const [instrumentEscrowPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('escrow'), response.toBuffer(), Buffer.from([0, i])],
      rfqModel.legs[i].instrumentProgram
    );

    const legAccounts: AccountMeta[] = [
      //`escrow`
      {
        pubkey: instrumentEscrowPda,
        isSigner: false,
        isWritable: true,
      },
      // `receiver_tokens`
      {
        pubkey: await getAssociatedTokenAddress(
          baseAssetMints[i].address,
          legTakerAmount > 0 ? maker : taker,
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

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .add({
      instruction: createPartiallySettleLegsInstruction(
        {
          protocol: protocol.address,
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
