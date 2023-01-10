import { Rfq, toRfq } from '../models';
import { toRfqAccount } from '../accounts';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '@/types';
import { Convergence } from '@/Convergence';
import { PsyoptionsEuropeanInstrument } from '@/plugins/psyoptionsEuropeanInstrumentModule';
import { SpotInstrument } from '@/plugins/spotInstrumentModule';
import { InstrumentClient } from '@/plugins/instrumentModule';

const Key = 'FindRfqsByInstrumentOperation' as const;

/**
 * Finds an RFQ by its token address.
 *
 * ```ts
 * const rfq = await convergence
 *   .rfqs()
 *   .findByInstrument({ instrument: SpotInstrument };
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
  instrument: SpotInstrument | PsyoptionsEuropeanInstrument;
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

      const instrumentClient = new InstrumentClient(convergence, instrument);
      const rfqProgram = convergence.programs().getRfq(programs);
      const rfqGpaBuilder = convergence
        .programs()
        .getGpaBuilder(rfqProgram.address)
        .where(0, RFQ_ACCOUNT_DISCRIMINATOR)
        .where(8, instrumentClient.getProgramAccount().pubkey.toBuffer());

      const unparsedRfqs = await rfqGpaBuilder.get();
      scope.throwIfCanceled();

      const rfqs: Rfq[] = [];

      for (const unparsedRfq of unparsedRfqs) {
        const rfqAccount = toRfqAccount(unparsedRfq);
        const rfq = toRfq(rfqAccount);

        rfqs.push(rfq);
      }

      return rfqs;
    },
  };
