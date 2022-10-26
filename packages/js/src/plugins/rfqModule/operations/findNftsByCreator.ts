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

const Key = 'FindNftsByCreatorOperation' as const;

/**
 * Finds multiple NFTs and SFTs by their creator at a given position.
 *
 * ```ts
 * // Find all by first creator.
 * const rfqs = await convergence
 *   .rfqs()
 *   .findAllByCreator({ creator };
 *
 * // Find all by second creator.
 * const rfqs = await convergence
 *   .rfqs()
 *   .findAllByCreator({ creator, position: 2 };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const findNftsByCreatorOperation =
  useOperation<FindNftsByCreatorOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type FindNftsByCreatorOperation = Operation<
  typeof Key,
  FindNftsByCreatorInput,
  FindNftsByCreatorOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type FindNftsByCreatorInput = {
  /** The address of the creator. */
  creator: PublicKey;

  /**
   * The position in which the provided creator should be located at.
   * E.g. `1` for searching the first creator, `2` for searching the
   * second creator, etc.
   *
   * @defaultValue `1`
   */
  position?: number;
};

/**
 * @group Operations
 * @category Outputs
 */
export type FindNftsByCreatorOutput = (Metadata | Rfq)[];

/**
 * @group Operations
 * @category Handlers
 */
export const findNftsByCreatorOperationHandler: OperationHandler<FindNftsByCreatorOperation> =
  {
    handle: async (
      operation: FindNftsByCreatorOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<FindNftsByCreatorOutput> => {
      const { programs } = scope;
      const { creator, position = 1 } = operation.input;

      const gpaBuilder = new MetadataV1GpaBuilder(
        convergence,
        convergence.programs().getTokenMetadata(programs).address
      );

      const mints = await gpaBuilder
        .selectMint()
        .whereCreator(position, creator)
        .getDataAsPublicKeys();
      scope.throwIfCanceled();

      const rfqs = await convergence.rfqs().findAllByMintList({ mints }, scope);
      scope.throwIfCanceled();

      return rfqs.filter((nft): nft is Metadata | Rfq => nft !== null);
    },
  };
