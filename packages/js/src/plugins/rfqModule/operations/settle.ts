import { createSettleInstruction, Side } from '@convergence-rfq/rfq';
import { PublicKey, AccountMeta } from '@solana/web3.js';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { Convergence } from '@/Convergence';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
  makeConfirmOptionsFinalizedOnMainnet,
} from '@/types';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
} from '@solana/spl-token';
import { TransactionBuilder, TransactionBuilderOptions } from '@/utils';
import { Mint } from '@/plugins/tokenModule';

const Key = 'SettleOperation' as const;

/**
 * Settles.
 *
 * ```ts
 * await convergence
 *   .rfqs()
 *   .settle({ address };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const settleOperation = useOperation<SettleOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type SettleOperation = Operation<typeof Key, SettleInput, SettleOutput>;

/**
 * @group Operations
 * @category Inputs
 */
export type SettleInput = {
  maker: PublicKey;

  taker: PublicKey;
  /** The address of the protocol account. */
  protocol?: PublicKey;
  /** The address of the Rfq account. */
  rfq: PublicKey;
  /** The address of the Response account. */
  response: PublicKey;

  quoteMint: Mint;

  baseAssetMints: Mint[];
};

/**
 * @group Operations
 * @category Outputs
 */
export type SettleOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const settleOperationHandler: OperationHandler<SettleOperation> = {
  handle: async (
    operation: SettleOperation,
    convergence: Convergence,
    scope: OperationScope
  ): Promise<SettleOutput> => {
    const builder = await settleBuilder(
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
export type SettleBuilderParams = SettleInput;

/**
 * Settles
 *
 * ```ts
 * const transactionBuilder = convergence
 *   .rfqs()
 *   .builders()
 *   .settle({ address });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const settleBuilder = async (
  convergence: Convergence,
  params: SettleBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<TransactionBuilder> => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const { rfq, response, baseAssetMints, quoteMint, maker, taker } = params;

  const rfqProgram = convergence.programs().getRfq(programs);
  const protocol = await convergence.protocol().get();

  const anchorRemainingAccounts: AccountMeta[] = [];

  const rfqModel = await convergence.rfqs().findRfqByAddress({ address: rfq });
  const responseModel = await convergence
    .rfqs()
    .findResponseByAddress({ address: response });

  for (let legIndex = 0; legIndex < rfqModel.legs.length; legIndex++) {
    const leg = rfqModel.legs[legIndex];
    const confirmationSide = responseModel.confirmed?.side;

    let legTakerAmount = -1;

    if (leg.side == Side.Ask) {
      legTakerAmount *= -1;
    }
    if (confirmationSide == Side.Bid) {
      legTakerAmount *= -1;
    }

    const instrumentProgramAccount: AccountMeta = {
      pubkey: rfqModel.legs[legIndex].instrumentProgram,
      isSigner: false,
      isWritable: false,
    };

    const [instrumentEscrowPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('escrow'), response.toBuffer(), Buffer.from([0, legIndex])],
      rfqModel.legs[legIndex].instrumentProgram
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
          baseAssetMints[legIndex].address,
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

  const confirmationSide = responseModel.confirmed?.side;

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
        rfqModel.fixedSize.__kind == 'QuoteAsset' &&
          confirmationSide == Side.Ask
          ? maker
          : taker,
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
      instruction: createSettleInstruction(
        {
          protocol: protocol.address,
          rfq,
          response,
          anchorRemainingAccounts,
        },
        rfqProgram.address
      ),
      signers: [],
      key: 'settle',
    });
};
