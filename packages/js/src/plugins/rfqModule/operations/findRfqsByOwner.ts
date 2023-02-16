import { PublicKey } from '@solana/web3.js';
import { Rfq /*toRfq*/ } from '../models';
//@ts-ignore
import { toRfqAccount } from '../accounts';
import { RfqGpaBuilder } from '../RfqGpaBuilder';
import { getPages } from '../helpers';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '@/types';
import { Convergence } from '@/Convergence';
import { SpotInstrument } from '@/plugins/spotInstrumentModule';
import { PsyoptionsEuropeanInstrument } from '@/plugins/psyoptionsEuropeanInstrumentModule';
import { PsyoptionsAmericanInstrument } from '@/plugins/psyoptionsAmericanInstrumentModule';

const Key = 'FindRfqsByOwnerOperation' as const;

/**
 * Finds multiple RFQs by a given owner.
 *
 * ```ts
 * const rfqs = await convergence
 *   .rfqs()
 *   .findAllByOwner({ owner: taker.publicKey };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const findRfqsByOwnerOperation =
  useOperation<FindRfqsByOwnerOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type FindRfqsByOwnerOperation = Operation<
  typeof Key,
  FindRfqsByOwnerInput,
  FindRfqsByOwnerOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type FindRfqsByOwnerInput = {
  /** The address of the owner. */
  owner: PublicKey;

  /** Optional array of Rfqs to search from. */
  rfqs?: Rfq[];

  rfqsPerPage?: number;

  numPages?: number;
};

/**
 * @group Operations
 * @category Outputs
 */
export type FindRfqsByOwnerOutput = Rfq[] | Rfq[][];

/**
 * @group Operations
 * @category Handlers
 */
export const findRfqsByOwnerOperationHandler: OperationHandler<FindRfqsByOwnerOperation> =
  {
    handle: async (
      operation: FindRfqsByOwnerOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<FindRfqsByOwnerOutput> => {
      const { owner, rfqs, rfqsPerPage = 10, numPages } = operation.input;
      const { programs } = scope;

      const spotInstrumentProgram = convergence.programs().getSpotInstrument();
      const psyoptionsEuropeanProgram = convergence
        .programs()
        .getPsyoptionsEuropeanInstrument();
      const psyoptionsAmericanProgram = convergence
        .programs()
        .getPsyoptionsAmericanInstrument();

      if (rfqs) {
        const rfqsByOwner: Rfq[] = [];

        for (const rfq of rfqs) {
          if (rfq.taker.toBase58() === owner.toBase58()) {
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

            rfqsByOwner.push(rfq);
          }
        }

        scope.throwIfCanceled();

        return rfqsByOwner;
      }
      const rfqProgram = convergence.programs().getRfq(programs);
      const rfqGpaBuilder = new RfqGpaBuilder(convergence, rfqProgram.address);
      const unparsedAccounts = await rfqGpaBuilder
        .withoutData()
        .whereTaker(owner)
        .get();
      scope.throwIfCanceled();

      const pages = getPages(unparsedAccounts, rfqsPerPage, numPages);

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
              const instrument = await PsyoptionsEuropeanInstrument.createFromLeg(
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
              const instrument = await PsyoptionsAmericanInstrument.createFromLeg(
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

      if (rfqPages.length === 1) {
        return rfqPages.flat();
      }

      return rfqPages;
    },
  };
