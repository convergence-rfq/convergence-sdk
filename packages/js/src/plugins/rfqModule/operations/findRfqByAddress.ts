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

const Key = 'FindRfqByAddressOperation' as const;

/**
 * Finds Rfq by a given address.
 *
 * ```ts
 * const rfq = await convergence
 *   .rfqs()
 *   .findByAddress({ address });
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const findRfqByAddressOperation =
  useOperation<FindRfqByAddressOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type FindRfqByAddressOperation = Operation<
  typeof Key,
  FindRfqByAddressInput,
  FindRfqByAddressOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type FindRfqByAddressInput = {
  /** The address of the Rfq. */
  address: PublicKey;
};

/**
 * @group Operations
 * @category Outputs
 */
export type FindRfqByAddressOutput = Rfq;

/**
 * @group Operations
 * @category Handlers
 */
export const findRfqByAddressOperationHandler: OperationHandler<FindRfqByAddressOperation> =
  {
    handle: async (
      operation: FindRfqByAddressOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<FindRfqByAddressOutput> => {
      const { commitment } = scope;
      const { address } = operation.input;
      scope.throwIfCanceled();

      const spotInstrumentProgram = convergence.programs().getSpotInstrument();
      const psyoptionsEuropeanProgram = convergence
        .programs()
        .getPsyoptionsEuropeanInstrument();
      const psyoptionsAmericanProgram = convergence
        .programs()
        .getPsyoptionsAmericanInstrument();

      const account = await convergence.rpc().getAccount(address, commitment);
      const rfq = toRfq(toRfqAccount(account));
      scope.throwIfCanceled();

      if (rfq.fixedSize.__kind == 'BaseAsset') {
        const parsedLegsMultiplierBps =
          (rfq.fixedSize.legsMultiplierBps as number) / 1_000_000_000;

        rfq.fixedSize.legsMultiplierBps = parsedLegsMultiplierBps;
      } else if (rfq.fixedSize.__kind == 'QuoteAsset') {
        const parsedQuoteAmount =
          (rfq.fixedSize.quoteAmount as number) / 1_000_000_000;

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
              (leg.instrumentAmount as number) /= 1_000_000_000;
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
              (leg.instrumentAmount as number) /= 1_000_000_000;
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

      return rfq;
    },
  };
