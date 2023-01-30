import { PublicKey } from '@solana/web3.js';
import { toResponseAccount } from '../accounts';
import { /*assertResponse,*/ Response, toResponse } from '../models/Response';
import { ResponseGpaBuilder } from '../ResponseGpaBuilder';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '@/types';
import { Convergence } from '@/Convergence';

const Key = 'FindResponsesByRfqsOperation' as const;

/**
 * Finds Responses by a list of given RFQ addresses.
 *
 * ```ts
 * const rfq = await convergence
 *   .rfqs()
 *   .findResponsesByRfqs({ addresses };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const findResponsesByRfqsOperation =
  useOperation<FindResponsesByRfqsOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type FindResponsesByRfqsOperation = Operation<
  typeof Key,
  FindResponsesByRfqsInput,
  FindResponsesByRfqsOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type FindResponsesByRfqsInput = {
  /** The addresses of the Rfqs. */
  addresses: PublicKey[];
};

/**
 * @group Operations
 * @category Outputs
 */
export type FindResponsesByRfqsOutput = Response[];

/**
 * @group Operations
 * @category Handlers
 */
export const findResponsesByRfqsOperationHandler: OperationHandler<FindResponsesByRfqsOperation> =
  {
    handle: async (
      operation: FindResponsesByRfqsOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<FindResponsesByRfqsOutput> => {
      const { programs } = scope;
      const { addresses } = operation.input;
      scope.throwIfCanceled();

      const rfqProgram = convergence.programs().getRfq(programs);
      const responseGpaBuilder = new ResponseGpaBuilder(
        convergence,
        rfqProgram.address
      );
      const responses = await responseGpaBuilder.get();
      scope.throwIfCanceled();

      const responseAccounts = responses
        .map<Response | null>((account) => {
          if (account === null) {
            return null;
          }

          try {
            return toResponse(toResponseAccount(account));
          } catch (e) {
            return null;
          }
        })
        .filter((response): response is Response => response !== null);

      const foundResponses: Response[] = [];

      for (const address of addresses) {
        for (const r of responseAccounts) {
          if (r.rfq.toBase58() === address.toBase58()) {
            foundResponses.push(r);
          }
        }
      }
      return foundResponses;
    },
  };
