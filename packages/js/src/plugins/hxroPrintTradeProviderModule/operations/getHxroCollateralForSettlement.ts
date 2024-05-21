import { VersionedTransaction, TransactionMessage } from '@solana/web3.js';

import { Convergence } from '../../../Convergence';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '../../../types';
import { lockHxroCollateralBuilder } from './lockHxroCollateral';
import {
  PrintTradeResponse,
  PrintTradeRfq,
  getAuthoritySide,
} from '@/plugins/rfqModule';

const Key = 'GetRequiredHxroCollateralForSettlementOperation' as const;

/**
 * @group Operations
 * @category Constructors
 */
export const getRequiredHxroCollateralForSettlementOperation =
  useOperation<GetRequiredHxroCollateralForSettlementOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type GetRequiredHxroCollateralForSettlementOperation = Operation<
  typeof Key,
  GetRequiredHxroCollateralForSettlementInput,
  GetRequiredHxroCollateralForSettlementOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type GetRequiredHxroCollateralForSettlementInput = {
  /** Rfq Account. */
  rfq: PrintTradeRfq;
  /** The response to prepare settlement for. */
  response: PrintTradeResponse;
};

/**
 * @group Operations
 * @category Outputs
 */
export type GetRequiredHxroCollateralForSettlementOutput = {
  remainingCollateral: number;
};

/**
 * @group Operations
 * @category Handlers
 */
export const getRequiredHxroCollateralForSettlementOperationHandler: OperationHandler<GetRequiredHxroCollateralForSettlementOperation> =
  {
    handle: async (
      operation: GetRequiredHxroCollateralForSettlementOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<GetRequiredHxroCollateralForSettlementOutput> => {
      const payer = convergence.identity().publicKey;
      const { rfq: rfqModel, response: responseModel } = operation.input;
      const { printTrade } = operation.input.rfq;

      const caller = convergence.identity();
      const side = getAuthoritySide(caller.publicKey, rfqModel, responseModel);
      if (!side) {
        throw new Error('caller is not authorized to prepare settlement');
      }
      const hxroContext = await printTrade.getHxroContextHelper(
        convergence,
        operation.input.response,
        side
      );
      const txBuilder = await lockHxroCollateralBuilder(
        convergence,
        {
          hxroContext,
          rfq: operation.input.rfq,
          response: operation.input.response,
          side,
        },
        scope
      );

      const remainingCollateral = 0;

      const lastValidBlockHeight = await convergence.rpc().getLatestBlockhash();
      const ixs = txBuilder.getInstructions();
      const txMessage = new TransactionMessage({
        payerKey: payer,
        recentBlockhash: lastValidBlockHeight.blockhash,
        instructions: ixs,
      }).compileToV0Message();

      const tx = new VersionedTransaction(txMessage);
      const simulateTxResult = await convergence.connection.simulateTransaction(
        tx,
        {
          sigVerify: false,
        }
      );

      if (simulateTxResult.value.err) {
        const { logs } = simulateTxResult.value;
        if (!logs) {
          return { remainingCollateral: 0 };
        }
        const logToParse = logs.find((l) => l.includes('Total Variance'));
        if (!logToParse || logToParse === '') {
          return { remainingCollateral: 0 };
        }
        const logsSplit = logToParse.split(',');

        let totalVariance = Number(logsSplit[0].split(':')[2]);
        let openOrdersVariance = Number(logsSplit[1].split(':')[1]);
        let positionalValue = Number(logsSplit[2].split(':')[1]);

        if (totalVariance < 0 || isNaN(totalVariance)) {
          totalVariance = 0;
        }
        if (openOrdersVariance < 0 || isNaN(openOrdersVariance)) {
          openOrdersVariance = 0;
        }
        if (positionalValue < 0 || isNaN(positionalValue)) {
          positionalValue = 0;
        }

        const remainingCollateralReq =
          (Math.sqrt(positionalValue) + Math.sqrt(openOrdersVariance)) * 1.5;
        return { remainingCollateral: remainingCollateralReq };
      }
      scope.throwIfCanceled();
      return { remainingCollateral };
    },
  };
