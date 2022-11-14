import { PublicKey } from '@solana/web3.js';
import { TokenGpaBuilder } from '../../tokenModule';
import { Rfq } from '../models';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '@/types';
import { Convergence } from '@/Convergence';

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
      const { programs } = scope;
      const { owner } = operation.input;

      const tokenProgram = convergence.programs().getToken(programs);
      const mints = await new TokenGpaBuilder(convergence, tokenProgram.address)
        .selectMint()
        .whereOwner(owner)
        .whereAmount(1)
        .getDataAsPublicKeys();
      scope.throwIfCanceled();

      const rfqs = await convergence.rfqs().findByToken(mints, scope);
      scope.throwIfCanceled();

      return rfqs.filter((x): x is Rfq => x !== null);
    },
  };
