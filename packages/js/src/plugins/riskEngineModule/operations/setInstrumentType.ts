import {
  createSetInstrumentTypeInstruction,
  InstrumentType,
} from '@convergence-rfq/risk-engine';
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

const Key = 'SetInstrumentTypeOperation' as const;

/**
 * Set instrument type
 *
 * ```ts
 * await convergence
 *   .riskEngine()
 *   .setInstrumentType({ ... };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const setInstrumentTypeOperation =
  useOperation<SetInstrumentTypeOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type SetInstrumentTypeOperation = Operation<
  typeof Key,
  SetInstrumentTypeInput,
  SetInstrumentTypeOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type SetInstrumentTypeInput = {
  /**
   * The owner of the protocol.
   */
  authority?: Signer;

  /**
   * Instrument type
   */
  instrumentType: InstrumentType;

  /**
   * Instrument program
   */
  instrumentProgram: PublicKey;
};

/**
 * @group Operations
 * @category Outputs
 */
export type SetInstrumentTypeOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const setInstrumentTypeOperationHandler: OperationHandler<SetInstrumentTypeOperation> =
  {
    handle: async (
      operation: SetInstrumentTypeOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<SetInstrumentTypeOutput> => {
      scope.throwIfCanceled();

      return setInstrumentTypeBuilder(
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
export type SetInstrumentTypeBuilderParams = SetInstrumentTypeInput;

/**
 * Adds an BaseAsset
 *
 * ```ts
 * const transactionBuilder = convergence
 *   .riskEngine()
 *   .builders()
 *   .setInstrumentType({ instrumentType, instrumentProgram });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const setInstrumentTypeBuilder = (
  convergence: Convergence,
  params: SetInstrumentTypeBuilderParams,
  options: TransactionBuilderOptions = {}
): TransactionBuilder => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const { authority = payer, instrumentProgram, instrumentType } = params;

  const riskEngineProgram = convergence.programs().getRiskEngine(programs);
  const rfqProgram = convergence.programs().getRfq(programs);

  const [config] = PublicKey.findProgramAddressSync(
    [Buffer.from('config')],
    riskEngineProgram.address
  );
  const [protocol] = PublicKey.findProgramAddressSync(
    [Buffer.from('protocol')],
    rfqProgram.address
  );

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .add({
      instruction: createSetInstrumentTypeInstruction(
        {
          authority: authority.publicKey,
          protocol,
          config,
        },
        {
          instrumentType,
          instrumentProgram,
        },
        riskEngineProgram.address
      ),
      signers: [authority],
      key: 'setInstrumentType',
    });
};
