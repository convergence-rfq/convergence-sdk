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

const Key = 'FindResponsesByOwnerOperation' as const;

/**
 * Finds all Responses for a given maker (owner).
 *
 * ```ts
 * const rfq = await convergence
 *   .rfqs()
 *   .findResponsesByOwner({
 *     address: maker.publicKey
 *   });
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
  /** The address of the maker of the responses. */
  owner: PublicKey;

  /** Optional number of Responses to return per page. */
  responsesPerPage?: number;

  /** Optional number of pages to return. */
  numPages?: number;
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
      // eslint-disable-next-line no-unused-vars
      scope: OperationScope
    ): Promise<FindResponsesByOwnerOutput> => {
      const { commitment } = scope;
      const { owner } = operation.input;

      const responseGpaBuilder = new ResponseGpaBuilder(convergence);
      const unparsedAccounts = await responseGpaBuilder
        .withoutData()
        .whereMaker(owner)
        .get();
      const unparsedAddresses = unparsedAccounts.map((acc) => acc.publicKey);

      const responses = [];

      const callCount = Math.ceil(unparsedAddresses.length / 100);

      for (let i = 0; i < callCount; i++) {
        const accounts = await convergence
          .rpc()
          .getMultipleAccounts(
            unparsedAddresses.slice(i * 100, (i + 1) * 100),
            commitment
          );

        for (const account of accounts) {
          const responseAccount = toResponseAccount(account);

          if (responseAccount.data.maker.toBase58() !== owner.toBase58()) {
            continue;
          }

          responses.push(
            convergence
              .rfqs()
              .findRfqByAddress({ address: responseAccount.data.rfq })
              .then((rfq) => toResponse(responseAccount, rfq))
          );
        }
      }

      return await Promise.all(responses);
    },
  };
