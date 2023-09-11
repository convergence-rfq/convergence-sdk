import { createInitializeConfigInstruction } from '@convergence-rfq/hxro-print-trade-provider';
import { Convergence } from '@/Convergence';
import {
  Operation,
  OperationHandler,
  OperationScope,
  PublicKey,
  makeConfirmOptionsFinalizedOnMainnet,
  useOperation,
} from '@/types';
import { SendAndConfirmTransactionResponse } from '@/plugins';
import { TransactionBuilder, TransactionBuilderOptions } from '@/utils';

const Key = 'InitializeHxroConfig' as const;

export const initializeHxroConfigOperation =
  useOperation<InitializeHxroConfigOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type InitializeHxroConfigOperation = Operation<
  typeof Key,
  InitializeHxroConfigInput,
  InitializeHxroConfigOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type InitializeHxroConfigInput = {
  validMpg: PublicKey;

  authority?: PublicKey;
};

/**
 * @group Operations
 * @category Outputs
 */
export type InitializeHxroConfigOutput = SendAndConfirmTransactionResponse;

/**
 * @group Operations
 * @category Handlers
 */
export const initializeHxroConfigOperationHandler: OperationHandler<InitializeHxroConfigOperation> =
  {
    handle: async (
      operation: InitializeHxroConfigOperation,
      cvg: Convergence,
      scope: OperationScope
    ): Promise<InitializeHxroConfigOutput> => {
      const builder = await initializeHxroConfigBuilder(
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

export const initializeHxroConfigBuilder = async (
  cvg: Convergence,
  params: InitializeHxroConfigInput,
  options: TransactionBuilderOptions = {}
): Promise<TransactionBuilder<{}>> => {
  const { authority = cvg.identity().publicKey, validMpg } = params;
  const { programs, payer = cvg.rpc().getDefaultFeePayer() } = options;

  const hxroPrintTradeProviderProgram = cvg
    .programs()
    .getHxroPrintTradeProvider();
  const systemProgram = cvg.programs().getSystem(programs);

  const protocol = cvg.protocol().pdas().protocol();
  const config = cvg.hxro().pdas().config();

  return TransactionBuilder.make<{}>()
    .setFeePayer(payer)
    .add({
      instruction: createInitializeConfigInstruction(
        {
          protocol,
          authority,
          config,
          systemProgram: systemProgram.address,
        },
        {
          validMpg,
        },
        hxroPrintTradeProviderProgram.address
      ),
      signers: [payer],
      key: 'initializeHxroConfig',
    });
};
