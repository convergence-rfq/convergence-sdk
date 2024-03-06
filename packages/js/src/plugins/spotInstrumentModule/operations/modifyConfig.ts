import { createModifyConfigInstruction } from '@convergence-rfq/spot-instrument';
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

const Key = 'ModifySpotInstrumentConfig' as const;

export const modifySpotInstrumentConfigOperation =
  useOperation<ModifySpotInstrumentConfigOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type ModifySpotInstrumentConfigOperation = Operation<
  typeof Key,
  ModifySpotInstrumentConfigInput,
  ModifySpotInstrumentConfigOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type ModifySpotInstrumentConfigInput = {
  feeBps: number;
};

/**
 * @group Operations
 * @category Outputs
 */
export type ModifySpotInstrumentConfigOutput =
  SendAndConfirmTransactionResponse;

/**
 * @group Operations
 * @category Handlers
 */
export const modifySpotInstrumentConfigOperationHandler: OperationHandler<ModifySpotInstrumentConfigOperation> =
  {
    handle: async (
      operation: ModifySpotInstrumentConfigOperation,
      cvg: Convergence,
      scope: OperationScope
    ): Promise<ModifySpotInstrumentConfigOutput> => {
      const builder = await modifySpotInstrumentBuilder(
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

export const modifySpotInstrumentBuilder = async (
  cvg: Convergence,
  params: ModifySpotInstrumentConfigInput,
  options: TransactionBuilderOptions = {}
): Promise<TransactionBuilder<{}>> => {
  const { feeBps } = params;
  const { payer = cvg.rpc().getDefaultFeePayer() } = options;

  const spotProgram = cvg.programs().getSpotInstrument();

  const protocol = cvg.protocol().pdas().protocol();
  const config = cvg.spotInstrument().pdas().config();

  return TransactionBuilder.make<{}>()
    .setFeePayer(payer)
    .add({
      instruction: createModifyConfigInstruction(
        {
          protocol,
          authority: cvg.identity().publicKey,
          config,
        },
        {
          feeBps: addDecimals(feeBps, SPOT_QUOTE_FEE_BPS),
        },
        spotProgram.address
      ),
      signers: [payer],
      key: 'ModifySpotInstrumentConfig',
    });
};
