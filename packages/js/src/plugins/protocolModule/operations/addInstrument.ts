import { createAddInstrumentInstruction } from '@convergence-rfq/rfq';
import { PublicKey } from '@solana/web3.js';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { Convergence } from '@/Convergence';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
  Signer,
} from '@/types';
import { TransactionBuilder, TransactionBuilderOptions } from '@/utils';

const Key = 'AddInstrumentOperation' as const;

/**
 * Add an Instrument
 *
 * ```ts
 * await convergence
 *   .rfqs()
 *   .addInstrument({ address };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const addInstrumentOperation = useOperation<AddInstrumentOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type AddInstrumentOperation = Operation<
  typeof Key,
  AddInstrumentInput,
  AddInstrumentOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type AddInstrumentInput = {
  /**
   * The owner of the protocol.
   */
  authority: Signer;

  /**
   * The protocol to add the instrument to.
   */
  protocol: PublicKey;

  /**
   * The instrument program to add to the protocol.
   */
  instrumentProgram: PublicKey;

  /*
   * The amount of lamports to allocate for the validate data account.
   */
  validateDataAccountAmount: number;

  prepareToSettleAccountAmount: number;

  settleAccountAmount: number;

  revertPreparationAccountAmount: number;

  cleanUpAccountAmount: number;
};

/**
 * @group Operations
 * @category Outputs
 */
export type AddInstrumentOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const addInstrumentOperationHandler: OperationHandler<AddInstrumentOperation> =
  {
    handle: async (
      operation: AddInstrumentOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<AddInstrumentOutput> => {
      scope.throwIfCanceled();

      return addInstrumentBuilder(
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
export type AddInstrumentBuilderParams = AddInstrumentInput;

/**
 * Adds an instrument
 *
 * ```ts
 * const transactionBuilder = convergences
 *   .rfqs()
 *   .builders()
 *   .addInstrument({ address });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const addInstrumentBuilder = (
  convergence: Convergence,
  params: AddInstrumentBuilderParams,
  options: TransactionBuilderOptions = {}
): TransactionBuilder => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const {
    authority,
    protocol,
    instrumentProgram,
    validateDataAccountAmount,
    prepareToSettleAccountAmount,
    settleAccountAmount,
    revertPreparationAccountAmount,
    cleanUpAccountAmount,
  } = params;

  const rfqProgram = convergence.programs().getRfq(programs);

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .add({
      instruction: createAddInstrumentInstruction(
        {
          authority: authority.publicKey,
          protocol,
          instrumentProgram,
        },
        {
          validateDataAccountAmount,
          prepareToSettleAccountAmount,
          settleAccountAmount,
          revertPreparationAccountAmount,
          cleanUpAccountAmount,
        },
        rfqProgram.address
      ),
      signers: [authority],
      key: 'addInstrument',
    });
};
