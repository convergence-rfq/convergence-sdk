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
  Program,
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
import { Receiver } from './getSettlementResult';
import { legToBaseAssetMint } from '@/plugins/instrumentModule';
import { prependWithProviderProgram } from '@/plugins/printTradeModule';
import { spotInstrumentProgram } from '@/plugins/spotInstrumentModule';
import { InstructionUniquenessTracker, getOrCreateATAtxBuilder } from '@/utils';
import { Protocol } from '@/plugins/protocolModule';
import { addComputeBudgetIxsIfNeeded } from '@/utils/helpers';

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
    const { ataTxBuilderArray, settleTxBuilder } = await settleBuilder(
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

    const lastValidBlockHeight = await convergence.rpc().getLatestBlockhash();
    const dedupAtaBuiders =
      InstructionUniquenessTracker.dedup(ataTxBuilderArray);
    const txs = [...dedupAtaBuiders, settleTxBuilder].map((txBuilder) =>
      txBuilder.toTransaction(lastValidBlockHeight)
    );
    const signedTxs = await convergence.identity().signAllTransactions(txs);

    const outputs = [];
    for (const signedTx of signedTxs) {
      const output = await convergence
        .rpc()
        .serializeAndSendTransaction(
          signedTx,
          lastValidBlockHeight,
          confirmOptions
        );

      outputs.push(output);
    }

    scope.throwIfCanceled();

    return { response: outputs[outputs.length - 1] };
  },
};

/**
 * @group Transaction Builders
 * @category Inputs
 */
export type SettleBuilderParams = SettleInput;

export type SettleBuilderResult = {
  ataTxBuilderArray: TransactionBuilder[];
  settleTxBuilder: TransactionBuilder;
};

/**
 * @group Transaction Builders
 * @category Constructors
 */
export const settleBuilder = async (
  convergence: Convergence,
  params: SettleBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<SettleBuilderResult> => {
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
  cvg: Convergence,
  params: SettleEscrowBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<SettleBuilderResult> => {
  const { programs, payer = cvg.rpc().getDefaultFeePayer() } = options;
  const { response, rfq, startIndex = 0 } = params;

  const responseModel =
    response instanceof PublicKey
      ? await cvg.rfqs().findResponseByAddress({ address: response })
      : response;
  const rfqModel =
    rfq ?? (await cvg.rfqs().findRfqByAddress({ address: responseModel.rfq }));

  if (
    responseModel.model !== 'escrowResponse' ||
    rfqModel.model !== 'escrowRfq'
  ) {
    throw new Error('Response is not settled as an escrow!');
  }

  const rfqProgram = cvg.programs().getRfq(programs);
  const protocol = await cvg.protocol().get();

  const ataTxBuilderArray: TransactionBuilder[] = [];
  const anchorRemainingAccounts: AccountMeta[] = [];

  const { legs, quote } = await cvg.rfqs().getSettlementResult({
    response: responseModel,
    rfq: rfqModel,
  });

  const accountsToAddContext = {
    cvg,
    protocol,
    rfq: rfqModel,
    response: responseModel,
    programs,
  };

  for (let legIndex = startIndex; legIndex < rfqModel.legs.length; legIndex++) {
    const leg = rfqModel.legs[legIndex];
    const { receiver } = legs[legIndex];

    const baseAssetMint = await legToBaseAssetMint(cvg, leg);

    if (leg.getProgramId().equals(spotInstrumentProgram.address)) {
      const { ataTxBuilder, accounts } = await getSettleAccountsSpot(
        baseAssetMint.address,
        receiver,
        {
          leg: legIndex,
        },
        accountsToAddContext
      );

      if (ataTxBuilder !== undefined) {
        ataTxBuilderArray.push(ataTxBuilder);
      }

      anchorRemainingAccounts.push(...accounts);
    } else {
      const accounts = getSettleAccountsNonSpot(
        leg.getProgramId(),
        baseAssetMint.address,
        receiver,
        { leg: legIndex },
        accountsToAddContext
      );

      anchorRemainingAccounts.push(...accounts);
    }
  }

  const { accounts, ataTxBuilder } = await getSettleAccountsSpot(
    rfqModel.quoteMint,
    quote.receiver,
    'quote',
    accountsToAddContext
  );
  if (ataTxBuilder !== undefined) {
    ataTxBuilderArray.push(ataTxBuilder);
  }
  anchorRemainingAccounts.push(...accounts);

  const settleTxBuilder = TransactionBuilder.make()
    .setFeePayer(payer)
    .add({
      instruction: ComputeBudgetProgram.setComputeUnitLimit({
        units: 1_400_000,
      }),
      signers: [],
    })
    .add({
      instruction: createSettleEscrowInstruction(
        {
          protocol: cvg.protocol().pdas().protocol(),
          rfq: rfqModel.address,
          response: responseModel.address,
          anchorRemainingAccounts,
        },
        rfqProgram.address
      ),
      signers: [],
      key: 'settle',
    });
  await addComputeBudgetIxsIfNeeded(settleTxBuilder, cvg);
  return {
    ataTxBuilderArray,
    settleTxBuilder,
  };
};

export const getSettleAccountsSpot = async (
  mint: PublicKey,
  receiver: Receiver,
  asset: { leg: number } | 'quote',
  context: {
    cvg: Convergence;
    protocol: Protocol;
    rfq: EscrowRfq;
    response: EscrowResponse;
    programs: Program[] | undefined;
  }
): Promise<{
  ataTxBuilder?: TransactionBuilder;
  accounts: AccountMeta[];
}> => {
  const { cvg, rfq, response, protocol, programs } = context;
  const programId = spotInstrumentProgram.address;
  const pdaClient = new InstrumentPdasClient(cvg);
  const escrow =
    asset === 'quote'
      ? pdaClient.quoteEscrow({
          response: response.address,
          program: programId,
        })
      : pdaClient.instrumentEscrow({
          response: response.address,
          index: asset.leg,
          rfqModel: rfq,
        });

  const { ataPubKey: authorityAtaKey, txBuilder: ataTxBuilder } =
    await getOrCreateATAtxBuilder(cvg, mint, protocol.authority, programs);

  const accounts = [
    {
      pubkey: programId,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: cvg.spotInstrument().pdas().config(),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: escrow,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: cvg
        .tokens()
        .pdas()
        .associatedTokenAccount({
          mint,
          owner: receiver === 'maker' ? response.maker : rfq.taker,
          programs,
        }),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: authorityAtaKey,
      isSigner: false,
      isWritable: true,
    },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
  ];

  return { ataTxBuilder, accounts };
};

export const getSettleAccountsNonSpot = (
  programId: PublicKey,
  mint: PublicKey,
  receiver: Receiver,
  asset: { leg: number } | 'quote',
  context: {
    cvg: Convergence;
    protocol: Protocol;
    rfq: EscrowRfq;
    response: EscrowResponse;
    programs: Program[] | undefined;
  }
) => {
  const { cvg, rfq, response, programs } = context;
  const pdaClient = new InstrumentPdasClient(cvg);
  const escrow =
    asset === 'quote'
      ? pdaClient.quoteEscrow({
          response: response.address,
          program: programId,
        })
      : pdaClient.instrumentEscrow({
          response: response.address,
          index: asset.leg,
          rfqModel: rfq,
        });

  return [
    {
      pubkey: programId,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: escrow,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: cvg
        .tokens()
        .pdas()
        .associatedTokenAccount({
          mint,
          owner: receiver === 'maker' ? response.maker : rfq.taker,
          programs,
        }),
      isSigner: false,
      isWritable: true,
    },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
  ];
};

export type SettlePrintTradeBuilderParams = {
  response: PublicKey | PrintTradeResponse;
  rfq?: PrintTradeRfq;
};

export const settlePrintTradeBuilder = async (
  convergence: Convergence,
  params: SettlePrintTradeBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<SettleBuilderResult> => {
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

  const settleTxBuilder = TransactionBuilder.make()
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

  return {
    ataTxBuilderArray: [],
    settleTxBuilder,
  };
};
