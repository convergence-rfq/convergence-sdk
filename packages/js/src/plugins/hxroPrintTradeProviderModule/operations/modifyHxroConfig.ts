import { createModifyConfigInstruction } from '@convergence-rfq/hxro-print-trade-provider';
import { configCache } from '../cache';
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

const Key = 'ModifyHxroConfig' as const;

export const modifyHxroConfigOperation =
  useOperation<ModifyHxroConfigOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type ModifyHxroConfigOperation = Operation<
  typeof Key,
  ModifyHxroConfigInput,
  ModifyHxroConfigOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type ModifyHxroConfigInput = {
  validMpg: PublicKey;

  authority?: PublicKey;
};

/**
 * @group Operations
 * @category Outputs
 */
export type ModifyHxroConfigOutput = SendAndConfirmTransactionResponse;

/**
 * @group Operations
 * @category Handlers
 */
export const modifyHxroConfigOperationHandler: OperationHandler<ModifyHxroConfigOperation> =
  {
    handle: async (
      operation: ModifyHxroConfigOperation,
      cvg: Convergence,
      scope: OperationScope
    ): Promise<ModifyHxroConfigOutput> => {
      const builder = await modifyHxroBuilder(cvg, operation.input, scope);
      scope.throwIfCanceled();

      const confirmOptions = makeConfirmOptionsFinalizedOnMainnet(
        cvg,
        scope.confirmOptions
      );
      configCache.clear();
      const output = await builder.sendAndConfirm(cvg, confirmOptions);
      scope.throwIfCanceled();
      return output.response;
    },
  };

export const modifyHxroBuilder = async (
  cvg: Convergence,
  params: ModifyHxroConfigInput,
  options: TransactionBuilderOptions = {}
): Promise<TransactionBuilder<{}>> => {
  const { authority = cvg.identity().publicKey, validMpg } = params;
  const { payer = cvg.rpc().getDefaultFeePayer() } = options;

  const hxroPrintTradeProviderProgram = cvg
    .programs()
    .getHxroPrintTradeProvider();

  const protocol = cvg.protocol().pdas().protocol();
  const config = cvg.hxro().pdas().config();

  return TransactionBuilder.make<{}>()
    .setFeePayer(payer)
    .add({
      instruction: createModifyConfigInstruction(
        {
          protocol,
          authority,
          config,
        },
        {
          validMpg,
        },
        hxroPrintTradeProviderProgram.address
      ),
      signers: [payer],
      key: 'ModifyHxroConfig',
    });
};
