import { createSetInstrumentTypeInstruction } from '@convergence-rfq/risk-engine';
import { PublicKey } from '@solana/web3.js';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { Config, assertConfig, toConfig } from '../models';
import { toConfigAccount } from '../accounts';
import { InstrumentType } from '../types';
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
      const { commitment } = scope;

      scope.throwIfCanceled();

      const builder = setInstrumentTypeBuilder(
        convergence,
        operation.input,
        scope
      );

      const { response } = await builder.sendAndConfirm(
        convergence,
        scope.confirmOptions
      );

      const account = await convergence
        .rpc()
        .getAccount(convergence.riskEngine().pdas().config(), commitment);
      const config = toConfig(toConfigAccount(account));
      scope.throwIfCanceled();
      assertConfig(config);

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
  options: TransactionBuilderOptions = {}
): TransactionBuilder => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const { authority = payer, instrumentProgram, instrumentType } = params;

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
          instrumentType,
          instrumentProgram,
        },
        riskEngineProgram.address
      ),
      signers: [authority],
      key: 'setInstrumentType',
    });
};
