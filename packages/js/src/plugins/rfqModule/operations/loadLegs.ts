import { PublicKey } from '@solana/web3.js';
import { Leg, Rfq } from '../models';
import { Convergence } from '@/Convergence';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '@/types';

// -----------------
// Operation
// -----------------

const Key = 'LoadLegsOperation' as const;

/**
 * Transforms a `Metadata` model into a `Nft` or `Sft` model.
 *
 * ```ts
 * const rfqs = await convergence
 *   .rfqs()
 *   .load({ metadata };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const loadLegsOperation = useOperation<LoadLegsOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type LoadLegsOperation = Operation<
  typeof Key,
  LoadLegsInput,
  LoadLegsOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type LoadLegsInput = {
  /** The address of the leg account. */
  leg: Leg;

  /**
   * The explicit token account to fetch with the NFT or SFT.
   *
   * If provided, and if that address is valid, the NFT or SFT returned
   * will be of the type `NftWithToken` or `SftWithToken` respectively.
   *
   * Alternatively, you may use the `tokenOwner` parameter to fetch the
   * associated token account.
   *
   * @defaultValue Defaults to not fetching the token account.
   */
  tokenAddress?: PublicKey;

  /**
   * The associated token account to fetch with the NFT or SFT.
   *
   * If provided, and if that account exists, the NFT or SFT returned
   * will be of the type `NftWithToken` or `SftWithToken` respectively.
   *
   * Alternatively, you may use the `tokenAddress` parameter to fetch the
   * token account at an explicit address.
   *
   * @defaultValue Defaults to not fetching the associated token account.
   */
  tokenOwner?: PublicKey;

  /**
   * Whether or not we should fetch the JSON Metadata for the NFT or SFT.
   *
   * @defaultValue `true`
   */
  loadJsonMetadata?: boolean;
};

/**
 * @group Operations
 * @category Outputs
 */
export type LoadLegsOutput = Rfq;

/**
 * @group Operations
 * @category Handlers
 */
export const loadMetadataOperationHandler: OperationHandler<LoadLegsOperation> =
  {
    handle: async (
      operation: LoadLegsOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<LoadLegsOutput> => {
      const { leg, loadJsonMetadata = true } = operation.input;

      const rfq = await convergence.rfqs().findByMint(
        {
          ...operation.input,
          mintAddress: leg.address,
          loadJsonMetadata,
        },
        scope
      );

      return rfq;
    },
  };
