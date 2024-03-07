import { createInitializeConfigInstruction } from '@convergence-rfq/spot-instrument';
import { SPOT_QUOTE_FEE_BPS } from '../constants';
import { Convergence } from '@/Convergence';
import {
  Operation,
  OperationHandler,
  OperationScope,
  makeConfirmOptionsFinalizedOnMainnet,
  useOperation,
} from '@/types';
import { SendAndConfirmTransactionResponse } from '@/plugins';
import {
  TransactionBuilder,
  TransactionBuilderOptions,
  addDecimals,
} from '@/utils';

const Key = 'InitializeSpotInstrumentConfig' as const;

export const initializeSpotInstrumentConfigOperation =
  useOperation<InitializeSpotInstrumentConfigOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type InitializeSpotInstrumentConfigOperation = Operation<
  typeof Key,
  InitializeSpotInstrumentConfigInput,
  InitializeSpotInstrumentConfigOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type InitializeSpotInstrumentConfigInput = {
  feeBps: number;
};

/**
 * @group Operations
 * @category Outputs
 */
export type InitializeSpotInstrumentConfigOutput =
  SendAndConfirmTransactionResponse;

/**
 * @group Operations
 * @category Handlers
 */
export const initializeSpotInstrumentConfigOperationHandler: OperationHandler<InitializeSpotInstrumentConfigOperation> =
  {
    handle: async (
      operation: InitializeSpotInstrumentConfigOperation,
      cvg: Convergence,
      scope: OperationScope
    ): Promise<InitializeSpotInstrumentConfigOutput> => {
      const builder = await initializeSpotInstrumentConfigBuilder(
        cvg,
        operation.input,
        scope
      );
      scope.throwIfCanceled();

      const confirmOptions = makeConfirmOptionsFinalizedOnMainnet(
        cvg,
        scope.confirmOptions
      );
      const output = await builder.sendAndConfirm(cvg, confirmOptions);
      scope.throwIfCanceled();
      return output.response;
    },
  };

export const initializeSpotInstrumentConfigBuilder = async (
  cvg: Convergence,
  params: InitializeSpotInstrumentConfigInput,
  options: TransactionBuilderOptions = {}
): Promise<TransactionBuilder<{}>> => {
  const { feeBps } = params;
  const { programs, payer = cvg.rpc().getDefaultFeePayer() } = options;

  const spotInstrumentProgram = cvg.programs().getSpotInstrument();
  const systemProgram = cvg.programs().getSystem(programs);

  const protocol = cvg.protocol().pdas().protocol();
  const config = cvg.spotInstrument().pdas().config();

  return TransactionBuilder.make<{}>()
    .setFeePayer(payer)
    .add({
      instruction: createInitializeConfigInstruction(
        {
          protocol,
          authority: cvg.identity().publicKey,
          config,
          systemProgram: systemProgram.address,
        },
        {
          feeBps: addDecimals(feeBps, SPOT_QUOTE_FEE_BPS),
        },
        spotInstrumentProgram.address
      ),
      signers: [payer],
      key: 'initializeSpotInstrumentConfig',
    });
};
