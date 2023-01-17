import { PublicKey, AccountMeta } from '@solana/web3.js';
import {
  createRevertSettlementPreparationInstruction,
  AuthoritySide,
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

const Key = 'RevertSettlementPreparationOperation' as const;

/**
 * Reverts settlement preparations.
 *
 * ```ts
 * const rfq = await convergence
 *   .rfqs()
 *   .revertSettlementPreparation({ address };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const revertSettlementPreparationOperation =
  useOperation<RevertSettlementPreparationOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type RevertSettlementPreparationOperation = Operation<
  typeof Key,
  RevertSettlementPreparationInput,
  RevertSettlementPreparationOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type RevertSettlementPreparationInput = {
  /** The protocol address */
  protocol?: PublicKey;
  /** The Rfq address */
  rfq: PublicKey;
  /** The response address */
  response: PublicKey;

  maker: PublicKey;

  taker: PublicKey;

  quoteMint: Mint;

  baseAssetMints: Mint[];

  /*
   * Args
   */

  side: AuthoritySide;
};

/**
 * @group Operations
 * @category Outputs
 */
export type RevertSettlementPreparationOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const revertSettlementPreparationOperationHandler: OperationHandler<RevertSettlementPreparationOperation> =
  {
    handle: async (
      operation: RevertSettlementPreparationOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<RevertSettlementPreparationOutput> => {
      const builder = await revertSettlementPreparationBuilder(
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

export type RevertSettlementPreparationBuilderParams =
  RevertSettlementPreparationInput;

/**
 * Partially reverts settlement preparations
 *
 * ```ts
 * const transactionBuilder = await convergence
 *   .rfqs()
 *   .builders()
 *   .partlyRevertSettlementPreparation();
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const revertSettlementPreparationBuilder = async (
  convergence: Convergence,
  params: RevertSettlementPreparationBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<TransactionBuilder> => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const rfqProgram = convergence.programs().getRfq(programs);

  const { rfq, response, side, maker, taker, quoteMint, baseAssetMints } =
    params;

  const protocol = await convergence.protocol().get();

  const anchorRemainingAccounts: AccountMeta[] = [];

  const rfqModel = await convergence.rfqs().findRfqByAddress({ address: rfq });
  const responseModel = await convergence
    .rfqs()
    .findResponseByAddress({ address: response });

  const sidePreparedLegs: number =
    side == AuthoritySide.Taker
      ? parseInt(responseModel.takerPreparedLegs.toString())
      : parseInt(responseModel.makerPreparedLegs.toString());

  let j = 0;

  for (let i = 0; i < sidePreparedLegs; i++) {
    const [instrumentEscrowPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('escrow'), response.toBuffer(), Buffer.from([0, i])],
      rfqModel.legs[i].instrumentProgram
    );

    const instrumentProgramAccount: AccountMeta = {
      pubkey: rfqModel.legs[i].instrumentProgram,
      isSigner: false,
      isWritable: false,
    };

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
          baseAssetMints[j].address,
          side == AuthoritySide.Maker ? maker : taker,
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

    j++;
  }

  const spotInstrumentProgram = convergence.programs().getSpotInstrument();

  const spotInstrumentProgramAccount: AccountMeta = {
    pubkey: spotInstrumentProgram.address,
    isSigner: false,
    isWritable: false,
  };

  //"quote" case so we pass Buffer.from([1, 0])
  const [quoteEscrowPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('escrow'), response.toBuffer(), Buffer.from([1, 0])],
    spotInstrumentProgram.address
  );

  const quoteAccounts: AccountMeta[] = [
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
        side == AuthoritySide.Maker ? maker : taker,
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
      instruction: createRevertSettlementPreparationInstruction(
        {
          protocol: protocol.address,
          rfq,
          response,
          anchorRemainingAccounts,
        },
        {
          side,
        },
        rfqProgram.address
      ),
      signers: [],
      key: 'revertSettlementPreparation',
    });
};
//remainaing accounts: (first is instrument program)
/*
  return [
      {
        pubkey: await getInstrumentEscrowPda(response.account, assetIdentifier, this.getProgramId()),
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: await this.mint.getAssociatedAddress(caller.publicKey),
        isSigner: false,
        isWritable: true,
      },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ];
  }
*/
