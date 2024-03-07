import { createAddPrintTradeProviderInstruction } from '@convergence-rfq/rfq';
import { PublicKey } from '@solana/web3.js';

import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { Convergence } from '../../../Convergence';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '../../../types';
import {
  TransactionBuilder,
  TransactionBuilderOptions,
} from '../../../utils/TransactionBuilder';
import { protocolCache } from '../cache';

const Key = 'AddPrintTradeProviderOperation' as const;

/**
 * @group Operations
 * @category Constructors
 */
export const addPrintTradeProviderOperation =
  useOperation<AddPrintTradeProviderOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type AddPrintTradeProviderOperation = Operation<
  typeof Key,
  AddPrintTradeProviderInput,
  AddPrintTradeProviderOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type AddPrintTradeProviderInput = {
  /**
   * The print trade provider program to add to the protocol.
   */
  printTradeProviderProgram: PublicKey;

  /*
   * If true, settlement could expire and be cancelled if both parties have prepared but haven't settled
   */
  settlementCanExpire: boolean;

  validateResponseAccountAmount: number;
};

/**
 * @group Operations
 * @category Outputs
 */
export type AddPrintTradeProviderOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const addPrintTradeProviderOperationHandler: OperationHandler<AddPrintTradeProviderOperation> =
  {
    handle: async (
      operation: AddPrintTradeProviderOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<AddPrintTradeProviderOutput> => {
      scope.throwIfCanceled();

      protocolCache.clear();

      return addPrintTradeProviderBuilder(
        convergence,
        operation.input,
        scope
      ).sendAndConfirm(convergence, scope.confirmOptions);
    },
  };

/**
 * @group Transaction Builders
 * @category Inputs
 */
export type AddPrintTradeProviderBuilderParams = AddPrintTradeProviderInput;

/**
 * @group Transaction Builders
 * @category Constructors
 */
export const addPrintTradeProviderBuilder = (
  cvg: Convergence,
  params: AddPrintTradeProviderBuilderParams,
  options: TransactionBuilderOptions = {}
): TransactionBuilder => {
  const { programs, payer = cvg.rpc().getDefaultFeePayer() } = options;
  const rfqProgram = cvg.programs().getRfq(programs);
  const {
    printTradeProviderProgram,
    settlementCanExpire,
    validateResponseAccountAmount,
  } = params;
  const authority = cvg.identity();

  // Clear the protocol cache so that the protocol is reloaded
  protocolCache.clear();

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .add({
      instruction: createAddPrintTradeProviderInstruction(
        {
          authority: authority.publicKey,
          protocol: cvg.protocol().pdas().protocol(),
          printTradeProviderProgram,
        },
        {
          settlementCanExpire,
          validateResponseAccountAmount,
        },
        rfqProgram.address
      ),
      signers: [authority],
      key: 'addPrintTradeProvider',
    });
};
