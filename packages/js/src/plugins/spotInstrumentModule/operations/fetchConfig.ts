import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '../../../types';
import { Convergence } from '../../../Convergence';
import { SpotInstrumentConfig, toSpotInstrumentConfig } from '../models';
import { toSpotInstrumentConfigAccount } from '../accounts';

const Key = 'FetchSpotInstrumentConfig' as const;

export const fetchSpotInstrumentConfigOperation =
  useOperation<FetchSpotInstrumentConfigOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type FetchSpotInstrumentConfigOperation = Operation<
  typeof Key,
  FetchSpotInstrumentConfigInput,
  FetchSpotInstrumentConfigOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type FetchSpotInstrumentConfigInput = {} | undefined;

/**
 * @group Operations
 * @category Outputs
 */
export type FetchSpotInstrumentConfigOutput = SpotInstrumentConfig;

/**
 * @group Operations
 * @category Handlers
 */
export const fetchSpotInstrumentConfigOperationHandler: OperationHandler<FetchSpotInstrumentConfigOperation> =
  {
    handle: async (
      _operation: FetchSpotInstrumentConfigOperation,
      cvg: Convergence,
      scope: OperationScope
    ): Promise<FetchSpotInstrumentConfigOutput> => {
      const { commitment } = scope;

      const configAddress = cvg.spotInstrument().pdas().config();
      const account = await cvg.rpc().getAccount(configAddress, commitment);
      const configAccount = toSpotInstrumentConfigAccount(account);

      return toSpotInstrumentConfig(configAccount);
    },
  };
