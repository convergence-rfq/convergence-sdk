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
import { SpotInstrument } from '@/plugins/spotInstrumentModule';
import { PsyoptionsEuropeanInstrument } from '@/plugins/psyoptionsEuropeanInstrumentModule';
import { PsyoptionsAmericanInstrument } from '@/plugins/psyoptionsAmericanInstrumentModule';

const Key = 'FindRfqsByInstrumentOperation' as const;

/**
 * Finds all RFQs corresponding to a given instrument program address.
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
  /** The instrument program to search for. */
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

      const spotInstrumentProgram = convergence.programs().getSpotInstrument();
      const psyoptionsEuropeanProgram = convergence
        .programs()
        .getPsyoptionsEuropeanInstrument();
      const psyoptionsAmericanProgram = convergence
        .programs()
        .getPsyoptionsAmericanInstrument();

      const rfqProgram = convergence.programs().getRfq(scope.programs);
      const rfqGpaBuilder = new RfqGpaBuilder(convergence, rfqProgram.address);
      const unparsedAccounts = await rfqGpaBuilder.get();

      const rfqAccounts = unparsedAccounts
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
      const rfqs: Rfq[] = [];
      for (const rfq of rfqAccounts) {
        for (const leg of rfq.legs) {
          if (
            leg.instrumentProgram.toBase58() ===
            instrumentProgram.address.toBase58()
          ) {
            if (rfq.fixedSize.__kind == 'BaseAsset') {
              const parsedLegsMultiplierBps =
                (rfq.fixedSize.legsMultiplierBps as number) / Math.pow(10, 9);

              rfq.fixedSize.legsMultiplierBps = parsedLegsMultiplierBps;
            } else if (rfq.fixedSize.__kind == 'QuoteAsset') {
              const parsedQuoteAmount =
                (rfq.fixedSize.quoteAmount as number) / Math.pow(10, 9);

              rfq.fixedSize.quoteAmount = parsedQuoteAmount;
            }

            for (const leg of rfq.legs) {
              if (
                leg.instrumentProgram.toBase58() ===
                psyoptionsEuropeanProgram.address.toBase58()
              ) {
                const instrument =
                  await PsyoptionsEuropeanInstrument.createFromLeg(
                    convergence,
                    leg
                  );

                if (instrument.legInfo?.amount) {
                  leg.instrumentAmount =
                    (leg.instrumentAmount as number) /= Math.pow(10, 9);
                }
              } else if (
                leg.instrumentProgram.toBase58() ===
                psyoptionsAmericanProgram.address.toBase58()
              ) {
                const instrument =
                  await PsyoptionsAmericanInstrument.createFromLeg(
                    convergence,
                    leg
                  );

                if (instrument.legInfo?.amount) {
                  leg.instrumentAmount =
                    (leg.instrumentAmount as number) /= Math.pow(10, 9);
                }
              } else if (
                leg.instrumentProgram.toBase58() ===
                spotInstrumentProgram.address.toBase58()
              ) {
                const instrument = await SpotInstrument.createFromLeg(
                  convergence,
                  leg
                );

                if (instrument.legInfo?.amount) {
                  leg.instrumentAmount =
                    (leg.instrumentAmount as number) /= Math.pow(10, 9);
                }
              }
            }

            rfqs.push(rfq);
          }
        }
      }
      const rfqSet = [...new Set(rfqs)];
      return rfqSet;
    },
  };
