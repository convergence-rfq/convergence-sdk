import { createSetInstrumentTypeInstruction } from '@convergence-rfq/risk-engine';

import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { Config, InstrumentType, toSolitaInstrumentType } from '../models';
import { Convergence } from '../../../Convergence';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
  Signer,
  PublicKey,
} from '../../../types';
import {
  TransactionBuilder,
  TransactionBuilderOptions,
} from '../../../utils/TransactionBuilder';
import { riskEngineConfigCache } from '../cache';
import { getInstrumentProgramIndex } from '@/plugins/instrumentModule';

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
   * The instrument type.
   */
  instrumentType: InstrumentType;

  /**
   * The address of the instrument program account.
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

  /** Risk engine config. */
  config: Config;
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
      const protocol = await convergence.protocol().get();
      const instrumentIndex = getInstrumentProgramIndex(
        protocol,
        operation.input.instrumentProgram
      );

      const builder = setInstrumentTypeBuilder(
        convergence,
        operation.input,
        instrumentIndex,
        scope
      );

      const { response } = await builder.sendAndConfirm(
        convergence,
        scope.confirmOptions
      );

      riskEngineConfigCache.clear();
      const config = await convergence.riskEngine().fetchConfig(scope);

      return { response, config };
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
  instrumentIndex: number,
  options: TransactionBuilderOptions = {}
): TransactionBuilder => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const { authority = payer, instrumentType } = params;

  const riskEngineProgram = convergence.programs().getRiskEngine(programs);

  const config = convergence.riskEngine().pdas().config();
  const protocol = convergence.protocol().pdas().protocol();

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
          instrumentIndex,
          instrumentType: toSolitaInstrumentType(instrumentType),
        },
        riskEngineProgram.address
      ),
      signers: [authority],
      key: 'setInstrumentType',
    });
};
