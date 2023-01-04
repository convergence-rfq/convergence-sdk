import { PublicKey } from '@solana/web3.js';
import { Rfq, toRfq } from '../models';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '@/types';
import { Convergence } from '@/Convergence';
import { toRfqAccount } from '../accounts';

const Key = 'FindRfqsByOwnerOperation' as const;

/**
 * Finds multiple NFTs and SFTs by a given owner.
 *
 * ```ts
 * const rfqs = await convergence
 *   .rfqs()
 *   .findAllByOwner({ owner };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const findRfqsByOwnerOperation =
  useOperation<FindRfqsByOwnerOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type FindRfqsByOwnerOperation = Operation<
  typeof Key,
  FindRfqsByOwnerInput,
  FindRfqsByOwnerOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type FindRfqsByOwnerInput = {
  /** The address of the owner. */
  owner: PublicKey;
};

/**
 * @group Operations
 * @category Outputs
 */
export type FindRfqsByOwnerOutput = Rfq[];

/**
 * @group Operations
 * @category Handlers
 */
export const findRfqsByOwnerOperationHandler: OperationHandler<FindRfqsByOwnerOperation> =
  {
    handle: async (
      operation: FindRfqsByOwnerOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<FindRfqsByOwnerOutput> => {
      const { owner } = operation.input;
      const { programs } = scope;

      scope.throwIfCanceled();

      const rfqProgram = convergence.programs().getRfq(programs);

      const RFQ_ACCOUNT_DISCRIMINATOR = Buffer.from([
        106, 19, 109, 78, 169, 13, 234, 58,
      ]);

      const rfqGpaBuilder = convergence
        .programs()
        .getGpaBuilder(rfqProgram.address)
        .where(0, RFQ_ACCOUNT_DISCRIMINATOR)
        .where(8, owner);

      const unparsedRfqs = await rfqGpaBuilder.get();
      scope.throwIfCanceled();

      let rfqs: Rfq[] = [];

      for (const unparsedRfq of unparsedRfqs) {
        const rfqAccount = toRfqAccount(unparsedRfq);
        const rfq = toRfq(rfqAccount);

        rfqs.push(rfq);
      }

      return rfqs;
    },
  };
