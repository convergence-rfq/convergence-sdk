import { PublicKey } from '@solana/web3.js';
import { toTokenAccount } from '../../tokenModule';
import { RfqWithToken } from '../models';
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

const Key = 'FindNftByTokenOperation' as const;

/**
 * Finds an NFT or an SFT by its token address.
 *
 * ```ts
 * const nft = await convergence
 *   .rfqs()
 *   .findByToken({ token };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const findNftByTokenOperation =
  useOperation<FindNftByTokenOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type FindNftByTokenOperation = Operation<
  typeof Key,
  FindNftByTokenInput,
  FindNftByTokenOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type FindNftByTokenInput = {
  /** The address of the token account. */
  token: PublicKey;

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
export type FindNftByTokenOutput = RfqWithToken;

/**
 * @group Operations
 * @category Handlers
 */
export const findNftByTokenOperationHandler: OperationHandler<FindNftByTokenOperation> =
  {
    handle: async (
      operation: FindNftByTokenOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<FindNftByTokenOutput> => {
      const token = toTokenAccount(
        await convergence.rpc().getAccount(operation.input.token)
      );
      scope.throwIfCanceled();

      const asset = await convergence.rfqs().findByMint(
        {
          ...operation.input,
          mintAddress: token.data.mint,
          tokenAddress: operation.input.token,
        },
        scope
      );

      return asset as FindNftByTokenOutput;
    },
  };
