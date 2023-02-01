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

const Key = 'FindResponsesByRfqOperation' as const;

/**
 * Finds Responses for a given RFQ address.
 *
 * ```ts
 * const rfq = await convergence
 *   .rfqs()
 *   .findResponsesByRfq({
 *     address
 *   });
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const findResponsesByRfqOperation =
  useOperation<FindResponsesByRfqOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type FindResponsesByRfqOperation = Operation<
  typeof Key,
  FindResponsesByRfqInput,
  FindResponsesByRfqOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type FindResponsesByRfqInput = {
  /** The address of the Rfq. */
  address: PublicKey;
};

/**
 * @group Operations
 * @category Outputs
 */
export type FindResponsesByRfqOutput = Response[];

/**
 * @group Operations
 * @category Handlers
 */
export const findResponsesByRfqOperationHandler: OperationHandler<FindResponsesByRfqOperation> =
  {
    handle: async (
      operation: FindResponsesByRfqOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<FindResponsesByRfqOutput> => {
      const { programs } = scope;
      const { address } = operation.input;
      scope.throwIfCanceled();

      const rfqProgram = convergence.programs().getRfq(programs);
      const responseGpaBuilder = new ResponseGpaBuilder(
        convergence,
        rfqProgram.address
      );
      const unparsedAccounts = await responseGpaBuilder.get();
      const responseAccounts = unparsedAccounts
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

      const responsesByRfq: Response[] = [];
      for (const response of responseAccounts) {
        if (response.rfq.toBase58() === address.toBase58()) {
          responsesByRfq.push(response);
        }
      }
      scope.throwIfCanceled();

      return responsesByRfq;
    },
  };
