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

const Key = 'FindRfqByTokenOperation' as const;

/**
 * Finds an RFQ by its token address.
 *
 * ```ts
 * const rfq = await convergence
 *   .rfqs()
 *   .findByToken({ token };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const findNftByTokenOperation =
  useOperation<FindRfqByTokenOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type FindRfqByTokenOperation = Operation<
  typeof Key,
  FindRfqByTokenInput,
  FindRfqByTokenOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type FindRfqByTokenInput = {
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
export type FindRfqByTokenOutput = RfqWithToken;

/**
 * @group Operations
 * @category Handlers
 */
export const findRfqByTokenOperationHandler: OperationHandler<FindRfqByTokenOperation> =
  {
    handle: async (
      operation: FindRfqByTokenOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<FindRfqByTokenOutput> => {
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

      return asset as FindRfqByTokenOutput;
    },
  };
