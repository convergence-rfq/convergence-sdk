import { PublicKey } from '@solana/web3.js';
import { Rfq, toRfq } from '../models';
import { toRfqAccount } from '../accounts';
import { RfqGpaBuilder } from '../RfqGpaBuilder';
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
};

/**
 * @group Operations
 * @category Outputs
 */
export type FindRfqsByOwnerOutput = Rfq[];

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
      const { owner, rfqs } = operation.input;
      const { programs } = scope;

      const spotInstrumentProgram = convergence.programs().getSpotInstrument();
      const psyoptionsEuropeanProgram = convergence
        .programs()
        .getPsyoptionsEuropeanInstrument();
      const psyoptionsAmericanProgram = convergence
        .programs()
        .getPsyoptionsAmericanInstrument();

      if (rfqs) {
        const rfqsByOwner = [];

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
                    (leg.instrumentAmount as number) /= 1_000_000_000;
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
      const gotRfqs = await rfqGpaBuilder.whereTaker(owner).get();
      scope.throwIfCanceled();

      return gotRfqs
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
    },
  };
