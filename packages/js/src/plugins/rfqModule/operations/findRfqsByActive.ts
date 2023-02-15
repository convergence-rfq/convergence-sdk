import { StoredRfqState } from '@convergence-rfq/rfq';
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

const Key = 'FindRfqsByActiveOperation' as const;

/**
 * Finds all active RFQs.
 *
 * ```ts
 * const rfq = await convergence
 *   .rfqs()
 *   .findByActive();
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const findRfqsByActiveOperation =
  useOperation<FindRfqsByActiveOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type FindRfqsByActiveOperation = Operation<
  typeof Key,
  FindRfqsByActiveInput,
  FindRfqsByActiveOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type FindRfqsByActiveInput = {};

/**
 * @group Operations
 * @category Outputs
 */
export type FindRfqsByActiveOutput = Rfq[];

/**
 * @group Operations
 * @category Handlers
 */
export const findRfqsByActiveOperationHandler: OperationHandler<FindRfqsByActiveOperation> =
  {
    handle: async (
      operation: FindRfqsByActiveOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<FindRfqsByActiveOutput> => {
      const { programs } = scope;

      const spotInstrumentProgram = convergence.programs().getSpotInstrument();
      const psyoptionsEuropeanProgram = convergence
        .programs()
        .getPsyoptionsEuropeanInstrument();
      const psyoptionsAmericanProgram = convergence
        .programs()
        .getPsyoptionsAmericanInstrument();

      const rfqProgram = convergence.programs().getRfq(programs);
      const rfqGpaBuilder = new RfqGpaBuilder(convergence, rfqProgram.address);
      const unparsedAccounts = await rfqGpaBuilder.get();
      scope.throwIfCanceled();

      const rfqs = unparsedAccounts
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

      const rfqActive: Rfq[] = [];
      for (const rfq of rfqs) {
        if (rfq.state == StoredRfqState.Active) {
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
                instrument.legInfo.amount /= Math.pow(10, instrument.decimals);
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
                instrument.legInfo.amount /= Math.pow(10, instrument.decimals);
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
                instrument.legInfo.amount /= Math.pow(10, instrument.decimals);
              }
            }
          }

          rfqActive.push(rfq);
        }
      }
      return rfqActive;
    },
  };
