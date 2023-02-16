import { PublicKey } from '@solana/web3.js';
import { OptionType } from '@mithraic-labs/tokenized-euros';
import { Rfq } from '../models';
//@ts-ignore
import { toRfqAccount } from '../accounts';
import { psyoptionsAmericanInstrumentProgram } from '../../psyoptionsAmericanInstrumentModule/programs';
import { psyoptionsEuropeanInstrumentProgram } from '../../psyoptionsEuropeanInstrumentModule/programs';
import { psyoptionsAmericanInstrumentDataSerializer } from '../../psyoptionsAmericanInstrumentModule/models/PsyoptionsAmericanInstrument';
import { Convergence } from '@/Convergence';
import { SpotInstrumentDataSerializer } from '@/plugins/spotInstrumentModule';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '@/types';
import { PsyoptionsEuropeanInstrument } from '@/plugins/psyoptionsEuropeanInstrumentModule';
import { getPages, convertRfqOutput } from '../helpers';

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

  rfqsPerPage?: number;

  numPages?: number;
};

/**
 * @group Operations
 * @category Outputs
 */
export type FindRfqsByTokenOutput = Rfq[][];

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
      const { mintAddress, rfqsPerPage = 10, numPages } = operation.input;
      scope.throwIfCanceled();

      const spotInstrumentProgram = convergence.programs().getSpotInstrument();
      const rfqProgram = convergence.programs().getRfq(programs);

      const rfqGpaBuilder = convergence
        .programs()
        .getGpaBuilder(rfqProgram.address);
      const unparsedAccounts = await rfqGpaBuilder.withoutData().get();

      const pages = getPages(unparsedAccounts, rfqsPerPage, numPages);

      const rfqPages: Rfq[][] = [];

      for (const page of pages) {
        const rfqPage = [];

        for (const unparsedAccount of page) {
          let rfq = await convergence
            .rfqs()
            .findRfqByAddress({ address: unparsedAccount.publicKey });

          if (rfq.quoteMint.toBase58() === mintAddress.toBase58()) {
            rfq = await convertRfqOutput(convergence, rfq);

            rfqPage.push(rfq);
          }
          for (const leg of rfq.legs) {
            if (
              leg.instrumentProgram.toBase58() ===
              psyoptionsAmericanInstrumentProgram.address.toBase58()
            ) {
              const data =
                psyoptionsAmericanInstrumentDataSerializer.deserialize(
                  Buffer.from(leg.instrumentData)
                )[0];

              if (data.optionMint.toBase58() === mintAddress.toBase58()) {
                rfq = await convertRfqOutput(convergence, rfq);

                rfqPage.push(rfq);
              }
            } else if (
              leg.instrumentProgram.toBase58() ===
              psyoptionsEuropeanInstrumentProgram.address.toBase58()
            ) {
              const instrument =
                await PsyoptionsEuropeanInstrument.createFromLeg(
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
                rfq = await convertRfqOutput(convergence, rfq);

                rfqPage.push(rfq);
              }
            } else if (
              leg.instrumentProgram.toBase58() ===
              spotInstrumentProgram.address.toBase58()
            ) {
              const data = SpotInstrumentDataSerializer.deserialize(
                Buffer.from(leg.instrumentData)
              )[0];

              if (data.mint.toBase58() === mintAddress.toBase58()) {
                rfq = await convertRfqOutput(convergence, rfq);

                rfqPage.push(rfq);
              }
            }
          }

          rfqPages.push(rfqPage);
        }

        scope.throwIfCanceled();

        // const rfqsByToken: Rfq[] = [];
      }

      return rfqPages;
      // return [rfqsByToken];
    },
  };
