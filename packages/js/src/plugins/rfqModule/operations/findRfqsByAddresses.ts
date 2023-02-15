import { PublicKey } from '@solana/web3.js';
import { Rfq, toRfq } from '../models';
import { toRfqAccount } from '../accounts';
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

const Key = 'FindRfqsByAddressesOperation' as const;

/**
 * Finds Rfqs corresponding to a list of addresses.
 *
 * ```ts
 * const rfq = await convergence
 *   .rfqs()
 *   .findByAddress({
 *     addresses: [rfq1.address, rfq2.address]
 *   });
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const findRfqsByAddressesOperation =
  useOperation<FindRfqsByAddressesOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type FindRfqsByAddressesOperation = Operation<
  typeof Key,
  FindRfqsByAddressesInput,
  FindRfqsByAddressesOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type FindRfqsByAddressesInput = {
  /** The addresses of the Rfqs. */
  addresses: PublicKey[];
};

/**
 * @group Operations
 * @category Outputs
 */
export type FindRfqsByAddressesOutput = Rfq[];

/**
 * @group Operations
 * @category Handlers
 */
export const findRfqsByAddressesOperationHandler: OperationHandler<FindRfqsByAddressesOperation> =
  {
    handle: async (
      operation: FindRfqsByAddressesOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<FindRfqsByAddressesOutput> => {
      const { addresses } = operation.input;
      const { commitment } = scope;
      scope.throwIfCanceled();

      const spotInstrumentProgram = convergence.programs().getSpotInstrument();
      const psyoptionsEuropeanProgram = convergence
        .programs()
        .getPsyoptionsEuropeanInstrument();
      const psyoptionsAmericanProgram = convergence
        .programs()
        .getPsyoptionsAmericanInstrument();

      const rfqs: Rfq[] = [];

      const accounts = await convergence
        .rpc()
        .getMultipleAccounts(addresses, commitment);

      for (const account of accounts) {
        const rfq = toRfq(toRfqAccount(account));

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
              leg.instrumentAmount =
                (leg.instrumentAmount as number) /= Math.pow(10, instrument.decimals);
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
              leg.instrumentAmount =
                (leg.instrumentAmount as number) /= Math.pow(10, instrument.decimals);
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
                (leg.instrumentAmount as number) /= Math.pow(10, instrument.decimals);
            }
          }
        }

        rfqs.push(rfq);
      }
      scope.throwIfCanceled();

      return rfqs;
    },
  };
