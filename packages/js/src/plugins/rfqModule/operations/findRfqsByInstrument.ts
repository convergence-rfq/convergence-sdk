import { Rfq } from '../models';
//@ts-ignore
import { toRfqAccount } from '../accounts';
import { getPages } from '../helpers';
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
// import { UnparsedAccount } from '@/types';

const Key = 'FindRfqsByInstrumentOperation' as const;

/**
 * Finds all RFQs corresponding to a given instrument program address.
 *
 * ```ts
 * const rfq = await convergence
 *   .rfqs()
 *   .findByInstrument({ instrumentProgram: SpotInstrumentProgram };
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

  pageConfig?: [numPages: number, rfqsPerPage: number];
};

/**
 * @group Operations
 * @category Outputs
 */
export type FindRfqsByInstrumentOutput = Rfq[] | Rfq[][];

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
      const { instrumentProgram, pageConfig = [10, 10] } = operation.input;

      const spotInstrumentProgram = convergence.programs().getSpotInstrument();
      const psyoptionsEuropeanProgram = convergence
        .programs()
        .getPsyoptionsEuropeanInstrument();
      const psyoptionsAmericanProgram = convergence
        .programs()
        .getPsyoptionsAmericanInstrument();

      const rfqProgram = convergence.programs().getRfq(scope.programs);
      const rfqGpaBuilder = new RfqGpaBuilder(convergence, rfqProgram.address);
      const unparsedAccounts = await rfqGpaBuilder.withoutData().get();
      scope.throwIfCanceled();

      const pages = getPages(unparsedAccounts, pageConfig[0]);

      const rfqPages: Rfq[][] = [];

      for (const page of pages) {
        const rfqPage = [];

        for (const unparsedAccount of page) {
          rfqPage.push(
            await convergence
              .rfqs()
              .findRfqByAddress({ address: unparsedAccount.publicKey })
          );
        }

        rfqPages.push(rfqPage);
      }

      for (const rfqPage of rfqPages) {
        for (const rfq of rfqPage) {
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
                    leg.instrumentAmount = (leg.instrumentAmount as number) /=
                      Math.pow(10, instrument.decimals);
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
                    leg.instrumentAmount = (leg.instrumentAmount as number) /=
                      Math.pow(10, instrument.decimals);
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
                    leg.instrumentAmount = (leg.instrumentAmount as number) /=
                      Math.pow(10, instrument.decimals);
                  }
                }
              }
            }
          }
        }
      }

      if (rfqPages.length === 1) {
        return rfqPages.flat();
      }

      return rfqPages;
    },
  };
