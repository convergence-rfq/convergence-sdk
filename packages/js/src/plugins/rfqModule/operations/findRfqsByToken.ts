import { PublicKey } from '@solana/web3.js';
import { OptionType } from '@mithraic-labs/tokenized-euros';
import { toRfq, Rfq } from '../models';
import { toRfqAccount } from '../accounts';
import { psyoptionsAmericanInstrumentProgram } from '../../psyoptionsAmericanInstrumentModule/programs';
import { psyoptionsEuropeanInstrumentProgram } from '../../psyoptionsEuropeanInstrumentModule/programs';
import { psyoptionsAmericanInstrumentDataSerializer } from '../../psyoptionsAmericanInstrumentModule/models/PsyoptionsAmericanInstrument';
import { Convergence } from '@/Convergence';
import { SpotInstrument, SpotInstrumentDataSerializer } from '@/plugins/spotInstrumentModule';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '@/types';
import { PsyoptionsEuropeanInstrument } from '@/plugins/psyoptionsEuropeanInstrumentModule';
import { PsyoptionsAmericanInstrument } from '@/plugins/psyoptionsAmericanInstrumentModule';

const Key = 'FindRfqsByTokenOperation' as const;

/**
 * Finds an RFQ by its mint address.
 *
 * ```ts
 * const rfq = await convergence
 *   .rfqs()
 *   .findByToken({ mintAddress };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const findRfqsByTokenOperation =
  useOperation<FindRfqsByTokenOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type FindRfqsByTokenOperation = Operation<
  typeof Key,
  FindRfqsByTokenInput,
  FindRfqsByTokenOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type FindRfqsByTokenInput = {
  /** The address of the mint account. */
  mintAddress: PublicKey;
};

/**
 * @group Operations
 * @category Outputs
 */
export type FindRfqsByTokenOutput = Rfq[];

/**
 * @group Operations
 * @category Handlers
 */
export const findRfqsByTokenOperationHandler: OperationHandler<FindRfqsByTokenOperation> =
  {
    handle: async (
      operation: FindRfqsByTokenOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<FindRfqsByTokenOutput> => {
      const { programs } = scope;
      const { mintAddress } = operation.input;
      scope.throwIfCanceled();

      const spotInstrumentProgram = convergence.programs().getSpotInstrument();
      const psyoptionsEuropeanProgram = convergence
        .programs()
        .getPsyoptionsEuropeanInstrument();
      const psyoptionsAmericanProgram = convergence
        .programs()
        .getPsyoptionsAmericanInstrument();

      const rfqProgram = convergence.programs().getRfq(programs);

      const rfqGpaBuilder = convergence
        .programs()
        .getGpaBuilder(rfqProgram.address);
      const unparsedAccounts = await rfqGpaBuilder.get();
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

      scope.throwIfCanceled();

      const rfqsByToken: Rfq[] = [];

      for (const rfq of rfqs) {
        if (rfq.quoteMint.toBase58() === mintAddress.toBase58()) {
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
              const instrument =
                await PsyoptionsEuropeanInstrument.createFromLeg(
                  convergence,
                  leg
                );

              if (instrument.legInfo?.amount) {
                // instrument.legInfo.amount /= 1_000_000_000;
                leg.instrumentAmount =
                  (leg.instrumentAmount as number) /= 1_000_000_000;
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
                // instrument.legInfo.amount /= 1_000_000_000;
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
                // instrument.legInfo.amount /= 1_000_000_000;
                leg.instrumentAmount =
                  (leg.instrumentAmount as number) /= 1_000_000_000;
              }
            }
          }

          rfqsByToken.push(rfq);
        }
        for (const leg of rfq.legs) {
          if (
            leg.instrumentProgram.toBase58() ===
            psyoptionsAmericanInstrumentProgram.address.toBase58()
          ) {
            const data = psyoptionsAmericanInstrumentDataSerializer.deserialize(
              Buffer.from(leg.instrumentData)
            )[0];

            if (data.optionMint.toBase58() === mintAddress.toBase58()) {
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
                  const instrument =
                    await PsyoptionsEuropeanInstrument.createFromLeg(
                      convergence,
                      leg
                    );

                  if (instrument.legInfo?.amount) {
                    // instrument.legInfo.amount /= 1_000_000_000;
                    leg.instrumentAmount =
                      (leg.instrumentAmount as number) /= 1_000_000_000;
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
                    // instrument.legInfo.amount /= 1_000_000_000;
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
                    // instrument.legInfo.amount /= 1_000_000_000;
                    leg.instrumentAmount =
                      (leg.instrumentAmount as number) /= 1_000_000_000;
                  }
                }
              }

              rfqsByToken.push(rfq);
            }
          } else if (
            leg.instrumentProgram.toBase58() ===
            psyoptionsEuropeanInstrumentProgram.address.toBase58()
          ) {
            // const data = psyoptionsEuropeanInstrumentDataSerializer.deserialize(
            //   Buffer.from(leg.instrumentData)
            // )[0];

            // if (data.optionMint.toBase58() === mintAddress.toBase58()) {
            //rfqByToken.push(rfq);
            // }
            const instrument = await PsyoptionsEuropeanInstrument.createFromLeg(
              convergence,
              leg
            );
            const euroMetaOptionMint = await convergence
              .tokens()
              .findMintByAddress({
                address:
                  instrument.optionType == OptionType.CALL
                    ? instrument.meta.callOptionMint
                    : instrument.meta.putOptionMint,
              });
            if (
              euroMetaOptionMint.address.toBase58() === mintAddress.toBase58()
            ) {
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
                  const instrument =
                    await PsyoptionsEuropeanInstrument.createFromLeg(
                      convergence,
                      leg
                    );

                  if (instrument.legInfo?.amount) {
                    // instrument.legInfo.amount /= 1_000_000_000;
                    leg.instrumentAmount =
                      (leg.instrumentAmount as number) /= 1_000_000_000;
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
                    // instrument.legInfo.amount /= 1_000_000_000;
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
                    // instrument.legInfo.amount /= 1_000_000_000;
                    leg.instrumentAmount =
                      (leg.instrumentAmount as number) /= 1_000_000_000;
                  }
                }
              }

              rfqsByToken.push(rfq);
            }
          } else if (
            leg.instrumentProgram.toBase58() ===
            spotInstrumentProgram.address.toBase58()
          ) {
            const data = SpotInstrumentDataSerializer.deserialize(
              Buffer.from(leg.instrumentData)
            )[0];

            if (data.mint.toBase58() === mintAddress.toBase58()) {
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
                  const instrument =
                    await PsyoptionsEuropeanInstrument.createFromLeg(
                      convergence,
                      leg
                    );

                  if (instrument.legInfo?.amount) {
                    // instrument.legInfo.amount /= 1_000_000_000;
                    leg.instrumentAmount =
                      (leg.instrumentAmount as number) /= 1_000_000_000;
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
                    // instrument.legInfo.amount /= 1_000_000_000;
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
                    // instrument.legInfo.amount /= 1_000_000_000;
                    leg.instrumentAmount =
                      (leg.instrumentAmount as number) /= 1_000_000_000;
                  }
                }
              }

              rfqsByToken.push(rfq);
            }
          }
        }
      }
      const rfqsTokenSorted = [...new Set(rfqsByToken)];
      return rfqsTokenSorted;
    },
  };
