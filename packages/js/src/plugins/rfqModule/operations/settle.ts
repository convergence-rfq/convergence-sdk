import {
  createSettleEscrowInstruction,
  createSettlePrintTradeInstruction,
} from '@convergence-rfq/rfq';
import { PublicKey, AccountMeta, ComputeBudgetProgram } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { Convergence } from '../../../Convergence';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
  makeConfirmOptionsFinalizedOnMainnet,
} from '../../../types';
import {
  TransactionBuilder,
  TransactionBuilderOptions,
} from '../../../utils/TransactionBuilder';
import { InstrumentPdasClient } from '../../instrumentModule';
import {
  EscrowResponse,
  EscrowRfq,
  PrintTradeResponse,
  PrintTradeRfq,
} from '../models';
import { legToBaseAssetMint } from '@/plugins/instrumentModule';
import { prependWithProviderProgram } from '@/plugins/printTradeModule';

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
  /** The address of the response account. */
  response: PublicKey;
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
 * @group Transaction Builders
 * @category Constructors
 */
export const settleBuilder = async (
  convergence: Convergence,
  params: SettleBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<TransactionBuilder> => {
  const responseModel = await convergence
    .rfqs()
    .findResponseByAddress({ address: params.response });
  const rfqModel = await convergence
    .rfqs()
    .findRfqByAddress({ address: responseModel.rfq });

  if (
    responseModel.model === 'escrowResponse' &&
    rfqModel.model === 'escrowRfq'
  ) {
    return settleEscrowBuilder(
      convergence,
      {
        response: responseModel,
        rfq: rfqModel,
      },
      options
    );
  } else if (
    responseModel.model === 'printTradeResponse' &&
    rfqModel.model === 'printTradeRfq'
  ) {
    return settlePrintTradeBuilder(
      convergence,
      {
        response: responseModel,
        rfq: rfqModel,
      },
      options
    );
  }

  throw new Error('Rfq type does not match with response type!');
};

export type SettleEscrowBuilderParams = {
  response: PublicKey | EscrowResponse;
  rfq?: EscrowRfq;
  startIndex?: number;
};

export const settleEscrowBuilder = async (
  convergence: Convergence,
  params: SettleEscrowBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<TransactionBuilder> => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const { response, rfq, startIndex = 0 } = params;

  const responseModel =
    response instanceof PublicKey
      ? await convergence.rfqs().findResponseByAddress({ address: response })
      : response;
  const rfqModel =
    rfq ??
    (await convergence.rfqs().findRfqByAddress({ address: responseModel.rfq }));

  if (
    responseModel.model !== 'escrowResponse' ||
    rfqModel.model !== 'escrowRfq'
  ) {
    throw new Error('Response is not settled as an escrow!');
  }

  const rfqProgram = convergence.programs().getRfq(programs);

  const anchorRemainingAccounts: AccountMeta[] = [];

  const spotInstrumentProgram = convergence.programs().getSpotInstrument();
  const { legs, quote } = await convergence.rfqs().getSettlementResult({
    response: responseModel,
    rfq: rfqModel,
  });

  for (let legIndex = startIndex; legIndex < rfqModel.legs.length; legIndex++) {
    const leg = rfqModel.legs[legIndex];
    const { receiver } = legs[legIndex];

    const baseAssetMint = await legToBaseAssetMint(convergence, leg);

    const instrumentProgramAccount: AccountMeta = {
      pubkey: rfqModel.legs[legIndex].getProgramId(),
      isSigner: false,
      isWritable: false,
    };

    const instrumentEscrowPda = new InstrumentPdasClient(
      convergence
    ).instrumentEscrow({
      response: responseModel.address,
      index: legIndex,
      rfqModel,
    });

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
            owner: receiver === 'maker' ? responseModel.maker : rfqModel.taker,
            programs,
          }),
        isSigner: false,
        isWritable: true,
      },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ];

    anchorRemainingAccounts.push(instrumentProgramAccount, ...legAccounts);
  }

  const spotInstrumentProgramAccount: AccountMeta = {
    pubkey: spotInstrumentProgram.address,
    isSigner: false,
    isWritable: false,
  };

  const quoteEscrowPda = new InstrumentPdasClient(convergence).quoteEscrow({
    response: responseModel.address,
    program: spotInstrumentProgram.address,
  });

  const quoteAccounts: AccountMeta[] = [
    //`escrow`
    {
      pubkey: quoteEscrowPda,
      isSigner: false,
      isWritable: true,
    },
    // `receiver_tokens`
    {
      pubkey: convergence
        .tokens()
        .pdas()
        .associatedTokenAccount({
          mint: rfqModel.quoteMint,
          owner:
            quote.receiver === 'maker' ? responseModel.maker : rfqModel.taker,
          programs,
        }),
      isSigner: false,
      isWritable: true,
    },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
  ];

  anchorRemainingAccounts.push(spotInstrumentProgramAccount, ...quoteAccounts);

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .add({
      instruction: ComputeBudgetProgram.setComputeUnitLimit({
        units: 1_400_000,
      }),
      signers: [],
    })
    .addTxPriorityFeeIx(convergence)
    .add({
      instruction: createSettleEscrowInstruction(
        {
          protocol: convergence.protocol().pdas().protocol(),
          rfq: rfqModel.address,
          response: responseModel.address,
          anchorRemainingAccounts,
        },
        rfqProgram.address
      ),
      signers: [],
      key: 'settle',
    });
};

export type SettlePrintTradeBuilderParams = {
  response: PublicKey | PrintTradeResponse;
  rfq?: PrintTradeRfq;
};

export const settlePrintTradeBuilder = async (
  convergence: Convergence,
  params: SettlePrintTradeBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<TransactionBuilder> => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const { response, rfq } = params;

  const responseModel =
    response instanceof PublicKey
      ? await convergence.rfqs().findResponseByAddress({ address: response })
      : response;
  const rfqModel =
    rfq ??
    (await convergence.rfqs().findRfqByAddress({ address: responseModel.rfq }));

  if (
    responseModel.model !== 'printTradeResponse' ||
    rfqModel.model !== 'printTradeRfq'
  ) {
    throw new Error('Response is not settled as a print trade!');
  }

  const rfqProgram = convergence.programs().getRfq(programs);

  const remainingAccounts = prependWithProviderProgram(
    rfqModel.printTrade,
    await rfqModel.printTrade.getSettlementAccounts(rfqModel, responseModel)
  );

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .add(
      {
        instruction: ComputeBudgetProgram.setComputeUnitLimit({
          units: 1_400_000,
        }),
        signers: [],
      },
      {
        instruction: createSettlePrintTradeInstruction(
          {
            protocol: convergence.protocol().pdas().protocol(),
            rfq: rfqModel.address,
            response: responseModel.address,
            anchorRemainingAccounts: remainingAccounts,
          },
          rfqProgram.address
        ),
        signers: [],
        key: 'settle',
      }
    );
};
