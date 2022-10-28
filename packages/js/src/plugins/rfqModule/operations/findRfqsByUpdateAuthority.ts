import { PublicKey } from '@solana/web3.js';
import { MetadataV1GpaBuilder } from '../gpaBuilders';
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

const Key = 'FindNftsByUpdateAuthorityOperation' as const;

/**
 * Finds multiple NFTs and SFTs by a given update authority.
 *
 * ```ts
 * const rfqs = await convergence
 *   .rfqs()
 *   .findAllByUpdateAuthority({ updateAuthority };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const findNftsByUpdateAuthorityOperation =
  useOperation<FindNftsByUpdateAuthorityOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type FindNftsByUpdateAuthorityOperation = Operation<
  typeof Key,
  FindNftsByUpdateAuthorityInput,
  FindNftsByUpdateAuthorityOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type FindNftsByUpdateAuthorityInput = {
  /** The address of the update authority. */
  updateAuthority: PublicKey;
};

/**
 * @group Operations
 * @category Outputs
 */
export type FindNftsByUpdateAuthorityOutput = (Metadata | Rfq)[];

/**
 * @group Operations
 * @category Handlers
 */
export const findNftsByUpdateAuthorityOperationHandler: OperationHandler<FindNftsByUpdateAuthorityOperation> =
  {
    handle: async (
      operation: FindNftsByUpdateAuthorityOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<FindNftsByUpdateAuthorityOutput> => {
      const { updateAuthority } = operation.input;

      const gpaBuilder = new MetadataV1GpaBuilder(
        convergence,
        convergence.programs().getTokenMetadata(scope.programs).address
      );

      const mints = await gpaBuilder
        .selectMint()
        .whereUpdateAuthority(updateAuthority)
        .getDataAsPublicKeys();
      scope.throwIfCanceled();

      const rfqs = await convergence.rfqs().findAllByMintList({ mints }, scope);
      scope.throwIfCanceled();

      return rfqs.filter((x): x is Metadata | Rfq => x !== null);
    },
  };
