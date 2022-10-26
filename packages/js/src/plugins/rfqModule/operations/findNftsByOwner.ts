import { PublicKey } from '@solana/web3.js';
import { TokenGpaBuilder } from '../../tokenModule';
import { Metadata, Rfq } from '../models';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '@/types';
import { Convergence } from '@/Convergence';

// -----------------
// Operation
// -----------------

const Key = 'FindNftsByOwnerOperation' as const;

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
export const findNftsByOwnerOperation =
  useOperation<FindNftsByOwnerOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type FindNftsByOwnerOperation = Operation<
  typeof Key,
  FindNftsByOwnerInput,
  FindNftsByOwnerOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type FindNftsByOwnerInput = {
  /** The address of the owner. */
  owner: PublicKey;
};

/**
 * @group Operations
 * @category Outputs
 */
export type FindNftsByOwnerOutput = (Metadata | Rfq)[];

/**
 * @group Operations
 * @category Handlers
 */
export const findNftsByOwnerOperationHandler: OperationHandler<FindNftsByOwnerOperation> =
  {
    handle: async (
      operation: FindNftsByOwnerOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<FindNftsByOwnerOutput> => {
      const { programs } = scope;
      const { owner } = operation.input;

      const tokenProgram = convergence.programs().getToken(programs);
      const mints = await new TokenGpaBuilder(convergence, tokenProgram.address)
        .selectMint()
        .whereOwner(owner)
        .whereAmount(1)
        .getDataAsPublicKeys();
      scope.throwIfCanceled();

      const rfqs = await convergence.rfqs().findAllByMintList({ mints }, scope);
      scope.throwIfCanceled();

      return rfqs.filter((x): x is Metadata | Rfq => x !== null);
    },
  };
