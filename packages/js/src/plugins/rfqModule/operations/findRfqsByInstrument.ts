import { Rfq, toRfq } from '../models';
import { toRfqAccount } from '../accounts';
import { RfqGpaBuilder } from '../RfqGpaBuilder';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
  Program,
} from '@/types';
import { Convergence } from '@/Convergence';

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
  /** The program to search for. */
  instrumentProgram: Program;
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
      const { instrumentProgram } = operation.input;

      const rfqProgram = convergence.programs().getRfq(scope.programs);
      const rfqGpaBuilder = new RfqGpaBuilder(convergence, rfqProgram.address);
      const unparsedRfqs = await rfqGpaBuilder.get();

      const rfqs = unparsedRfqs
        .map<Rfq | null>((account) => {
          if (account === null) {
            return null;
          }

          try {
            return toRfq(toRfqAccount(account));
          } catch (e) {
            return null;
          }
        })
        .filter((rfq): rfq is Rfq => rfq !== null);
      const rfq: Rfq[] = [];
      for (const r of rfqs) {
        for (const l of r.legs) {
          if (
            l.instrumentProgram.toBase58() ===
            instrumentProgram.address.toBase58()
          ) {
            rfq.push(r);
          }
        }
      }
      const rfqSet = [...new Set(rfq)];
      return rfqSet;
    },
  };
