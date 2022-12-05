import { PublicKey } from '@solana/web3.js';
import { toRfq, Rfq } from '../models';
// import { PROGRAM_ID } from '@convergence-rfq/rfq';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '@/types';
import { Convergence } from '@/Convergence';
import { toRfqAccount } from '../accounts';

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
  useOperation<FindRfqsByTokenOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type FindRfqsByTokenOperation = Operation<
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
   * The explicit token account to fetch with the Rfq.
   *
   * If provided, and if that address is valid, the Rfq returned
   * will be of the type `RfqWithToken`.
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
   * will be of the type `RfqWithToken`.
   *
   * Alternatively, you may use the `tokenAddress` parameter to fetch the
   * token account at an explicit address.
   *
   * @defaultValue Defaults to not fetching the associated token account.
   */
  tokenOwner?: PublicKey;
};

/**
 * @group Operations
 * @category Outputs
 */
export type FindRfqsByTokenOutput = Rfq[];

/**
 * @group Operations
 * @category Handlers
 */
export const findRfqsByTokenOperationHandler: OperationHandler<FindRfqsByTokenOperation> =
  {
    handle: async (
      operation: FindRfqsByTokenOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<FindRfqsByTokenOutput> => {
      const { programs } = scope;
      const { mintAddress } = operation.input;
      scope.throwIfCanceled();

      const rfqProgram = convergence.programs().getRfq(programs);

      const RFQ_ACCOUNT_DISCRIMINATOR = Buffer.from([
        106, 19, 109, 78, 169, 13, 234, 58,
      ]);

      const rfqGpaBuilder = convergence
        .programs()
        .getGpaBuilder(rfqProgram.address)
        .where(0, RFQ_ACCOUNT_DISCRIMINATOR)
        .where(42, mintAddress);

      const unparsedRfqs = await rfqGpaBuilder.get();
      scope.throwIfCanceled();

      let rfqs: Rfq[] = [];

      for (const unparsedRfq of unparsedRfqs) {
        const rfqAccount = toRfqAccount(unparsedRfq);
        const rfq = toRfq(rfqAccount);

        rfqs.push(rfq);
      }

      return rfqs;
    },
  };
