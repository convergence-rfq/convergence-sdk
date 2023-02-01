import { PublicKey } from '@solana/web3.js';
import { toResponseAccount } from '../accounts';
import { Response, toResponse } from '../models/Response';
import { GpaBuilder } from '@/utils';

import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '@/types';
import { Convergence } from '@/Convergence';

const Key = 'FindResponsesByOwnerOperation' as const;

/**
 * Finds Response by a given address.
 *
 * ```ts
 * const rfq = await convergence
 *   .rfqs()
 *   .findResponseByAddress({ address };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const findResponsesByOwnerOperation =
  useOperation<FindResponsesByOwnerOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type FindResponsesByOwnerOperation = Operation<
  typeof Key,
  FindResponsesByOwnerInput,
  FindResponsesByOwnerOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type FindResponsesByOwnerInput = {
  /** The address of the Response. */
  address: PublicKey;
};

/**
 * @group Operations
 * @category Outputs
 */
export type FindResponsesByOwnerOutput = Response[];

/**
 * @group Operations
 * @category Handlers
 */
export const findResponsesByOwnerOperationHandler: OperationHandler<FindResponsesByOwnerOperation> =
  {
    handle: async (
      operation: FindResponsesByOwnerOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<FindResponsesByOwnerOutput> => {
      const { address } = operation.input;
      scope.throwIfCanceled();
      const responsesByowner: Response[] = [];
      const gpaBuilder = new GpaBuilder(
        convergence,
        convergence.programs().getRfq().address
      );
      const unparsedAccounts = await gpaBuilder.get();
      const responseAccounts = unparsedAccounts
        .map<Response | null>((account) => {
          if (account == null) {
            return null;
          }
          try {
            return toResponse(toResponseAccount(account));
          } catch (e) {
            return null;
          }
        })
        .filter((response): response is Response => response != null);
      for (const response of responseAccounts) {
        if (response.maker.toBase58() === address.toBase58()) {
          responsesByowner.push(response);
        }
      }
      scope.throwIfCanceled();

      return responsesByowner;
    },
  };
