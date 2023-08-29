import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '../../../types';
import { Convergence } from '../../../Convergence';
import { toHxroPrintTradeProviderConfigAccount } from '../accounts';
import {
  HxroPrintTradeProviderConfig,
  toHxroPrintTradeProviderConfig,
} from '../models';

const Key = 'GetHxroPrintTradeProviderConfig' as const;

export const getHxroPrintTradeProviderConfigOperation =
  useOperation<GetHxroPrintTradeProviderConfigOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type GetHxroPrintTradeProviderConfigOperation = Operation<
  typeof Key,
  GetHxroPrintTradeProviderConfigInput,
  GetHxroPrintTradeProviderConfigOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type GetHxroPrintTradeProviderConfigInput = {} | undefined;

/**
 * @group Operations
 * @category Outputs
 */
export type GetHxroPrintTradeProviderConfigOutput =
  HxroPrintTradeProviderConfig;

/**
 * @group Operations
 * @category Handlers
 */
export const getHxroPrintTradeProviderConfigOperationHandler: OperationHandler<GetHxroPrintTradeProviderConfigOperation> =
  {
    handle: async (
      _operation: GetHxroPrintTradeProviderConfigOperation,
      cvg: Convergence,
      scope: OperationScope
    ): Promise<GetHxroPrintTradeProviderConfigOutput> => {
      const { commitment } = scope;

      const configAddress = cvg.hxro().pdas().config();
      const account = await cvg.rpc().getAccount(configAddress, commitment);
      const configAccount = toHxroPrintTradeProviderConfigAccount(account);

      const config = toHxroPrintTradeProviderConfig(configAccount);

      scope.throwIfCanceled();

      return config;
    },
  };
