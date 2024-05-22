import { createPreparePrintTradeSettlementInstruction } from '@convergence-rfq/rfq';
import { PublicKey } from '@solana/web3.js';

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
import { getAuthoritySide } from '../helpers';
import { toSolitaAuthoritySide } from '../models';
import { prependWithProviderProgram } from '@/plugins/printTradeModule';

const Key = 'PreparePrintTradeSettlementOperation' as const;

/**
 * @group Operations
 * @category Constructors
 */
export const preparePrintTradeSettlementOperation =
  useOperation<PreparePrintTradeSettlementOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type PreparePrintTradeSettlementOperation = Operation<
  typeof Key,
  PreparePrintTradeSettlementInput,
  PreparePrintTradeSettlementOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type PreparePrintTradeSettlementInput = {
  /** The address of the Rfq account. */
  rfq: PublicKey;

  /** The address of the Response account. */
  response: PublicKey;
};

/**
 * @group Operations
 * @category Outputs
 */
export type PreparePrintTradeSettlementOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const preparePrintTradeSettlementOperationHandler: OperationHandler<PreparePrintTradeSettlementOperation> =
  {
    handle: async (
      operation: PreparePrintTradeSettlementOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<PreparePrintTradeSettlementOutput> => {
      const builders = await preparePrintTradeSettlementBuilders(
        convergence,
        {
          ...operation.input,
        },
        scope
      );

      const confirmOptions = makeConfirmOptionsFinalizedOnMainnet(
        convergence,
        scope.confirmOptions
      );

      const lastValidBlockHeight = await convergence.rpc().getLatestBlockhash();
      const txs = builders.map((x) => x.toTransaction(lastValidBlockHeight));
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
export type PreparePrintTradeSettlementBuilderParams =
  PreparePrintTradeSettlementInput;

/**
 * Prepares for settlement
 *
 * ```ts
 * const transactionBuilder = convergence
 *   .rfqs()
 *   .builders()
 *   .preparePrintTradeSettlement({ address });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const preparePrintTradeSettlementBuilders = async (
  cvg: Convergence,
  params: PreparePrintTradeSettlementBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<TransactionBuilder[]> => {
  const { programs, payer = cvg.rpc().getDefaultFeePayer() } = options;
  const { rfq, response } = params;

  const caller = cvg.identity();
  const rfqProgram = cvg.programs().getRfq(programs);

  const rfqModel = await cvg.rfqs().findRfqByAddress({ address: rfq });
  const responseModel = await cvg
    .rfqs()
    .findResponseByAddress({ address: response });

  if (
    responseModel.model !== 'printTradeResponse' ||
    rfqModel.model !== 'printTradeRfq'
  ) {
    throw new Error('Response is not settled as a print trade!');
  }

  const side = getAuthoritySide(caller.publicKey, rfqModel, responseModel);
  if (side === null) {
    throw Error('Passed caller is neither a taker nor a maker');
  }

  const { printTrade } = rfqModel;

  const { accounts: printTradeAccounts, builders } =
    await printTrade.getSettlementPreparations(
      rfqModel,
      responseModel,
      side,
      options
    );

  const remainingAccounts = prependWithProviderProgram(
    printTrade,
    printTradeAccounts
  );

  const preparePrintTradeIx = {
    instruction: createPreparePrintTradeSettlementInstruction(
      {
        caller: caller.publicKey,
        protocol: cvg.protocol().pdas().protocol(),
        rfq,
        response,
        anchorRemainingAccounts: remainingAccounts,
      },
      {
        side: toSolitaAuthoritySide(side),
      },
      rfqProgram.address
    ),
    signers: [caller],
    key: 'preparePrintTradeSettlement',
  };

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .add(...builders, preparePrintTradeIx)
    .divideToMultipleBuildersThatFit();
};
