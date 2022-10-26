import { PublicKey } from '@solana/web3.js';
import { toMetadataAccount } from '../accounts';
import { Metadata, Rfq, toMetadata } from '../models';
import { Convergence } from '@/Convergence';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '@/types';
import { GmaBuilder } from '@/utils';

// -----------------
// Operation
// -----------------

const Key = 'FindNftsByMintListOperation' as const;

/**
 * Finds multiple NFTs and SFTs by a given list of mint addresses.
 *
 * ```ts
 * const rfqs = await convergence
 *   .rfqs()
 *   .findAllByMintList({ mints: [...] };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const findNftsByMintListOperation =
  useOperation<FindNftsByMintListOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type FindNftsByMintListOperation = Operation<
  typeof Key,
  FindNftsByMintListInput,
  FindNftsByMintListOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type FindNftsByMintListInput = {
  /** The addresses of all mint accounts we want to fetch. */
  mints: PublicKey[];
};

/**
 * @group Operations
 * @category Outputs
 */
export type FindNftsByMintListOutput = (Metadata | Rfq | null)[];

/**
 * @group Operations
 * @category Handlers
 */
export const findNftsByMintListOperationHandler: OperationHandler<FindNftsByMintListOperation> =
  {
    handle: async (
      operation: FindNftsByMintListOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<FindNftsByMintListOutput> => {
      const { commitment, programs } = scope;
      const { mints } = operation.input;
      const nftPdas = convergence.rfqs().pdas();
      const metadataPdas = mints.map((mint) =>
        nftPdas.metadata({ mint, programs })
      );
      const metadataInfos = await GmaBuilder.make(convergence, metadataPdas, {
        commitment,
      }).get();
      scope.throwIfCanceled();

      return metadataInfos.map<Metadata | null>((account) => {
        if (!account.exists) {
          return null;
        }

        try {
          return toMetadata(toMetadataAccount(account));
        } catch (error) {
          return null;
        }
      });
    },
  };
