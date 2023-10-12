import { PublicKey } from '@solana/web3.js';

import { Response, toResponse } from '../models/Response';
import { toResponseAccount } from '../accounts';
import { ResponseGpaBuilder } from '../ResponseGpaBuilder';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '../../../types';
import { Convergence } from '../../../Convergence';

const Key = 'FindResponsesByRfqOperation' as const;

/**
 * Finds Responses for a given RFQ address.
 *
 * ```ts
 * const rfq = await convergence.rfqs().findResponsesByRfq({ address });
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
      const { commitment } = scope;
      const { address } = operation.input;

      const responseGpaBuilder = new ResponseGpaBuilder(convergence);
      const unparsedAccounts = await responseGpaBuilder
        .withoutData()
        .whereRfq(address)
        .get();
      const responseAddresses = unparsedAccounts.map((acc) => acc.publicKey);

      const rfq = await convergence.rfqs().findRfqByAddress({ address });

      const responses: Response[] = [];

      for (let i = 0; i < Math.ceil(responseAddresses.length / 100); i++) {
        const accounts = await convergence
          .rpc()
          .getMultipleAccounts(
            responseAddresses.slice(i * 100, (i + 1) * 100),
            commitment
          );

        for (const account of accounts) {
          responses.push(toResponse(toResponseAccount(account), rfq));
        }
      }

      return responses;
    },
  };
