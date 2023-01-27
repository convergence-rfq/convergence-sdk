import { PublicKey } from '@solana/web3.js';
import { toResponseAccount } from '../accounts';
import { assertResponse, Response, toResponse } from '../models/Response';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '@/types';
import { Convergence } from '@/Convergence';

const Key = 'FindResponsesByRfqOperation' as const;

/**
 * Finds Response by a given address.
 *
 * ```ts
 * const rfq = await convergence
 *   .rfqs()
 *   .findResponsesByRfq({ address };
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
export type FindResponsesByRfqOutput = Response;

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
      const { commitment } = scope;
      const { address } = operation.input;
      scope.throwIfCanceled();

      const account = await convergence.rpc().getAccount(address, commitment);
      const response = toResponse(toResponseAccount(account));
      assertResponse(response);
      scope.throwIfCanceled();

      return response;
    },
  };



//   const rfqProgram = convergence.programs().getRfq(programs);
//   const rfqGpaBuilder = new RfqGpaBuilder(convergence, rfqProgram.address);
//   const rfqs = await rfqGpaBuilder.get();
//   scope.throwIfCanceled();

//   const rfqAccounts = rfqs
//     .map<Rfq | null>((account) => {
//       if (account === null) {
//         return null;
//       }

//       try {
//         return toRfq(toRfqAccount(account));
//       } catch (e) {
//         return null;
//       }
//     })
//     .filter((rfq): rfq is Rfq => rfq !== null);

//   const rfqActive: Rfq[] = [];
//   for (const r of rfqAccounts) {
//     if (r.state == StoredRfqState.Active) {
//       rfqActive.push(r);
//     }
//   }