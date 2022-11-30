import { PublicKey } from '@solana/web3.js';
import { Rfq, toRfq } from '../models';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '@/types';
import { Convergence } from '@/Convergence';

const Key = 'FindRfqsByTokenOperation' as const;

/**
 * Finds an RFQ by its mint address.
 *
 * ```ts
 * const rfq = await convergence
 *   .rfqs()
 *   .findByToken({ tokenAddress };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const findRfqsByTokenOperation =
  useOperation<FindRfqByTokenOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type FindRfqByTokenOperation = Operation<
  typeof Key,
  FindRfqsByTokenInput,
  FindRfqsByTokenOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type FindRfqsByTokenInput = {
  /** The address of the mint account. */
  mintAddress: PublicKey;

  /**
   * The explicit token account to fetch with the Rfq or SFT.
   *
   * If provided, and if that address is valid, the Rfq or SFT returned
   * will be of the type `RfqWithToken` or `SftWithToken` respectively.
   *
   * Alternatively, you may use the `tokenOwner` parameter to fetch the
   * associated token account.
   *
   * @defaultValue Defaults to not fetching the token account.
   */
  tokenAddress?: PublicKey;

  /**
   * The associated token account to fetch with the Rfq.
   *
   * If provided, and if that account exists, the Rfq returned
   * will be of the type `RfqWithToken` or `SftWithToken` respectively.
   *
   * Alternatively, you may use the `tokenAddress` parameter to fetch the
   * token account at an explicit address.
   *
   * @defaultValue Defaults to not fetching the associated token account.
   */
  tokenOwner?: PublicKey;

  /**
   * Whether or not we should fetch the JSON Metadata for the Rfq or SFT.
   *
   * @defaultValue `true`
   */
  loadJsonMetadata?: boolean;
};

/**
 * @group Operations
 * @category Outputs
 */
export type FindRfqsByTokenOutput = Rfq;

/**
 * @group Operations
 * @category Handlers
 */
export const findRfqByMintOperationHandler: OperationHandler<FindRfqByTokenOperation> =
  {
    handle: async (
      operation: FindRfqByTokenOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<FindRfqsByTokenOutput> => {
      scope.throwIfCanceled();

      /*
      TODO: directly pull RFQ by token here
      */

      return toRfq([]);
    },
  };
