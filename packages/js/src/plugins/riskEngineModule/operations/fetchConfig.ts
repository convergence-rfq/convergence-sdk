import { toConfigAccount } from '../accounts';
import { toConfig, assertConfig, Config } from '../models';
import { Convergence } from '@/Convergence';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '@/types';

const Key = 'FetchConfigOperation' as const;

/**
 * Fetch current Rist Engine configuration
 *
 * ```ts
 * await convergence
 *   .riskEngine()
 *   .fetchConfig();
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const fetchConfigOperation = useOperation<FetchConfigOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type FetchConfigOperation = Operation<
  typeof Key,
  FetchConfigInput,
  FetchConfigOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type FetchConfigInput = {};

/**
 * @group Operations
 * @category Outputs
 */
export type FetchConfigOutput = Config;

/**
 * @group Operations
 * @category Handlers
 */
export const fetchConfigOperationHandler: OperationHandler<FetchConfigOperation> =
  {
    handle: async (
      _operation: FetchConfigOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<FetchConfigOutput> => {
      const { commitment } = scope;
      scope.throwIfCanceled();

      const account = await convergence
        .rpc()
        .getAccount(convergence.riskEngine().pdas().config(), commitment);
      const config = toConfig(toConfigAccount(account));
      assertConfig(config);

      return config;
    },
  };
