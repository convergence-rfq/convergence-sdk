import { PublicKey } from '@solana/web3.js';
import { toTokenAccount } from '../../tokenModule';
import { Rfq } from '../models';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '@/types';
import { Convergence } from '@/Convergence';

const Key = 'FindRfqByInstrumentOperation' as const;

/**
 * Finds an RFQ by its token address.
 *
 * ```ts
 * const rfq = await convergence
 *   .rfqs()
 *   .findByInstrument({ instrument };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const findRfqsByInstrumentOperation =
  useOperation<FindRfqByInstrumentOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type FindRfqByInstrumentOperation = Operation<
  typeof Key,
  FindRfqsByInstrumentInput,
  FindRfqsByInstrumentOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type FindRfqsByInstrumentInput = {
  /** The address of the token account. */
  instrument: PublicKey;

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
export type FindRfqsByInstrumentOutput = Rfq;

/**
 * @group Operations
 * @category Handlers
 */
export const findRfqByTokenOperationHandler: OperationHandler<FindRfqByInstrumentOperation> =
  {
    handle: async (
      operation: FindRfqByInstrumentOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<FindRfqsByInstrumentOutput> => {
      const token = toTokenAccount(
        await convergence.rpc().getAccount(operation.input.instrument)
      );
      scope.throwIfCanceled();

      const asset = await convergence.rfqs().findByToken(
        {
          ...operation.input,
          mintAddress: token.data.mint,
          tokenAddress: operation.input.instrument,
        },
        scope
      );

      return asset as FindRfqsByInstrumentOutput;
    },
  };
