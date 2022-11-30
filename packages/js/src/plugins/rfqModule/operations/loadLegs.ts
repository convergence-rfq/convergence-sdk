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
  /** The leg account. */
  leg: Leg;
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
export const loadLegsOperationHandler: OperationHandler<LoadLegsOperation> =
  {
    handle: async (
      operation: LoadLegsOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<LoadLegsOutput> => {
      // const { leg } = operation.input;

      const rfq = await convergence.rfqs().load(
        {
          ...operation.input,
        },
        scope
      );

      return rfq;
    },
  };
