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

const Key = 'FetchHxroPrintTradeProviderConfig' as const;

export const fetchHxroPrintTradeProviderConfigOperation =
  useOperation<FetchHxroPrintTradeProviderConfigOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type FetchHxroPrintTradeProviderConfigOperation = Operation<
  typeof Key,
  FetchHxroPrintTradeProviderConfigInput,
  FetchHxroPrintTradeProviderConfigOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type FetchHxroPrintTradeProviderConfigInput = {} | undefined;

/**
 * @group Operations
 * @category Outputs
 */
export type FetchHxroPrintTradeProviderConfigOutput =
  HxroPrintTradeProviderConfig;

/**
 * @group Operations
 * @category Handlers
 */
export const fetchHxroPrintTradeProviderConfigOperationHandler: OperationHandler<FetchHxroPrintTradeProviderConfigOperation> =
  {
    handle: async (
      _operation: FetchHxroPrintTradeProviderConfigOperation,
      cvg: Convergence,
      scope: OperationScope
    ): Promise<FetchHxroPrintTradeProviderConfigOutput> => {
      const { commitment } = scope;

      const configAddress = cvg.hxro().pdas().config();
      const account = await cvg.rpc().getAccount(configAddress, commitment);
      const configAccount = toHxroPrintTradeProviderConfigAccount(account);

      const config = toHxroPrintTradeProviderConfig(configAccount);

      scope.throwIfCanceled();

      return config;
    },
  };
