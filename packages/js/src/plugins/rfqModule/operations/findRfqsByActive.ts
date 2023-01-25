import { StoredRfqState } from '@convergence-rfq/rfq';
import { Rfq, toRfq } from '../models';
import { toRfqAccount } from '../accounts';
import { RfqGpaBuilder } from '../RfqGpaBuilder';

import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '@/types';
import { Convergence } from '@/Convergence';

const Key = 'FindRfqsByActiveOperation' as const;

export const findRfqsByActiveOperation =
  useOperation<FindRfqsByActiveOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type FindRfqsByActiveOperation = Operation<
  typeof Key,
  FindRfqsByActiveInput,
  FindRfqsByActiveOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type FindRfqsByActiveInput = {};

/**
 * @group Operations
 * @category Outputs
 */
export type FindRfqsByActiveOutput = Rfq[];

/**
 * @group Operations
 * @category Handlers
 */
export const findRfqsByActiveOperationHandler: OperationHandler<FindRfqsByActiveOperation> =
  {
    handle: async (
      operation: FindRfqsByActiveOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<FindRfqsByActiveOutput> => {
      const { programs } = scope;

      const rfqProgram = convergence.programs().getRfq(programs);
      const rfqGpaBuilder = new RfqGpaBuilder(convergence, rfqProgram.address);
      const rfqs = await rfqGpaBuilder.get();
      scope.throwIfCanceled();

      const rfqAccounts = rfqs
        .map<Rfq | null>((account) => {
          if (account === null) {
            return null;
          }

          try {
            return toRfq(toRfqAccount(account));
          } catch (e) {
            return null;
          }
        })
        .filter((rfq): rfq is Rfq => rfq !== null);

      const rfqActive: Rfq[] = [];
      for (const r of rfqAccounts) {
        if (r.state == StoredRfqState.Active) {
          rfqActive.push(r);
        }
      }
      return rfqActive;
    },
  };
