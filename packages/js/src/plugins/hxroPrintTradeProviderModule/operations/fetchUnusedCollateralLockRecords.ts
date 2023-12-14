import { LockedCollateralRecord } from '@convergence-rfq/hxro-print-trade-provider';

import { LockCollateralRecordGpaBuilder } from '../gpa';
import { Convergence } from '@/Convergence';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '@/types';

const Key = 'fetchUnusedCollateralLockRecords' as const;

export const fetchUnusedCollateralLockRecordsOperation =
  useOperation<FetchUnusedCollateralLockRecordsOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type FetchUnusedCollateralLockRecordsOperation = Operation<
  typeof Key,
  FetchUnusedCollateralLockRecordsInput,
  FetchUnusedCollateralLockRecordsOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type FetchUnusedCollateralLockRecordsInput = {} | undefined;

/**
 * @group Operations
 * @category Outputs
 */
export type FetchUnusedCollateralLockRecordsOutput = LockedCollateralRecord[];

/**
 * @group Operations
 * @category Handlers
 */
export const fetchUnusedCollateralLockRecordsOperationHandler: OperationHandler<FetchUnusedCollateralLockRecordsOperation> =
  {
    handle: async (
      _operation: FetchUnusedCollateralLockRecordsOperation,
      cvg: Convergence,
      scope: OperationScope
    ): Promise<FetchUnusedCollateralLockRecordsOutput> => {
      const { programs } = scope;
      const hxroPrintTradeProviderProgram = cvg
        .programs()
        .getHxroPrintTradeProvider(programs);
      const gpaBuilder = new LockCollateralRecordGpaBuilder(
        cvg,
        hxroPrintTradeProviderProgram.address
      );

      const unparsedAccounts = await gpaBuilder
        .whereUser(cvg.identity().publicKey)
        .whereInUse(false)
        .get();

      return unparsedAccounts.map(
        (acc) => LockedCollateralRecord.deserialize(acc.data)[0]
      );
    },
  };
