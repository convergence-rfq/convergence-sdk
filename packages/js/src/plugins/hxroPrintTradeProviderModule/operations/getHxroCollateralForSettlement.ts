import { VersionedTransaction, TransactionMessage } from '@solana/web3.js';

import { Convergence } from '../../../Convergence';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '../../../types';
import { HxroContextHelper, HxroPrintTrade } from '../printTrade';
import { lockHxroCollateralBuilder } from './lockHxroCollateral';
import {
  AuthoritySide,
  PrintTradeResponse,
  PrintTradeRfq,
} from '@/plugins/rfqModule';

const Key = 'GetRequiredHxroCollateralForSettlementOperation' as const;

/**
 * @group Operations
 * @category Constructors
 */
export const GetRequiredHxroCollateralForSettlementOperation =
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
  /** The side of the authority. */
  side: AuthoritySide;
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
      const payer = await convergence.identity().publicKey;
      const { printTrade } = operation.input.rfq;

      const hxroContext = await printTrade.getHxroContextHelper(
        convergence,
        operation.input.response,
        operation.input.side
      );
      const txBuilder = await lockHxroCollateralBuilder(
        convergence,
        {
          hxroContext,
          rfq: operation.input.rfq,
          response: operation.input.response,
          side: operation.input.side,
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

        // for (const log of logs) {
        // }
      }
      scope.throwIfCanceled();
      return { remainingCollateral };
    },
  };
