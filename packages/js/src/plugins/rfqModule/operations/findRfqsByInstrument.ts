import { PublicKey } from '@solana/web3.js';
import { Rfq, toRfq } from '../models';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '@/types';
import { Convergence } from '@/Convergence';
import { toRfqAccount } from '../accounts';

const Key = 'FindRfqsByInstrumentOperation' as const;

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
  useOperation<FindRfqsByInstrumentOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type FindRfqsByInstrumentOperation = Operation<
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
};

/**
 * @group Operations
 * @category Outputs
 */
export type FindRfqsByInstrumentOutput = Rfq[];

/**
 * @group Operations
 * @category Handlers
 */
export const findRfqsByInstrumentOperationHandler: OperationHandler<FindRfqsByInstrumentOperation> =
  {
    handle: async (
      operation: FindRfqsByInstrumentOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<FindRfqsByInstrumentOutput> => {
      const { programs } = scope;
      const { instrument } = operation.input;

      const RFQ_ACCOUNT_DISCRIMINATOR = Buffer.from([
        106, 19, 109, 78, 169, 13, 234, 58,
      ]);

      const rfqProgram = convergence.programs().getRfq(programs);

      const rfqGpaBuilder = convergence
        .programs()
        .getGpaBuilder(rfqProgram.address)
        .where(0, RFQ_ACCOUNT_DISCRIMINATOR)
        .where(8, instrument);

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
