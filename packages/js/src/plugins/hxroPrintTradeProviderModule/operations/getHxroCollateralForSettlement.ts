import { VersionedTransaction, TransactionMessage } from '@solana/web3.js';

import { Convergence } from '../../../Convergence';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '../../../types';
import { HxroContextHelper } from '../printTrade';
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
  /** The hxroContext. */
  hxroContext: HxroContextHelper;
};

/**
 * @group Operations
 * @category Outputs
 */
export type GetRequiredHxroCollateralForSettlementOutput = {
  excessCollateral: number;
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
      const txBuilder = await lockHxroCollateralBuilder(
        convergence,
        operation.input,
        scope
      );

      const excessCollateral = 0;

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
          throw new Error('Simulate transaction failed');
        }
        for (const log of logs) {
        }
      }
      scope.throwIfCanceled();
      return { excessCollateral };
    },
  };
