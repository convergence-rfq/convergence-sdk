import { createPreparePrintTradeSettlementInstruction } from '@convergence-rfq/rfq';
import { PublicKey, ComputeBudgetProgram } from '@solana/web3.js';

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

  /** Additional parameters specific for each print trade provider can be passed as this parameter. */
  additionalPrintTradeInfo: any;
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
      const builder = await preparePrintTradeSettlementBuilder(
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

      const output = await builder.sendAndConfirm(convergence, confirmOptions);
      scope.throwIfCanceled();

      return { ...output };
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
export const preparePrintTradeSettlementBuilder = async (
  cvg: Convergence,
  params: PreparePrintTradeSettlementBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<TransactionBuilder> => {
  const { programs, payer = cvg.rpc().getDefaultFeePayer() } = options;
  const { rfq, response, additionalPrintTradeInfo } = params;

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
  const printTradeAccounts = prependWithProviderProgram(
    printTrade,
    await printTrade.getSettlementPreparationAccounts(
      rfqModel,
      responseModel,
      side,
      additionalPrintTradeInfo
    )
  );

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .add(
      {
        instruction: ComputeBudgetProgram.setComputeUnitLimit({
          units: 1400000,
        }),
        signers: [],
      },
      {
        instruction: createPreparePrintTradeSettlementInstruction(
          {
            caller: caller.publicKey,
            protocol: cvg.protocol().pdas().protocol(),
            rfq,
            response,
            anchorRemainingAccounts: printTradeAccounts,
          },
          {
            side: toSolitaAuthoritySide(side),
          },
          rfqProgram.address
        ),
        signers: [caller],
        key: 'preparePrintTradeSettlement',
      }
    );
};
