import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '../../../types';
import { Convergence } from '../../../Convergence';
import { HxroPrintTradeProviderConfig } from '../models';
import { configCache } from '../cache';

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

      const config = await configCache.get(cvg, commitment);

      scope.throwIfCanceled();

      return config;
    },
  };
