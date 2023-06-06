import { PublicKey } from '@solana/web3.js';
import { OptionType } from '@mithraic-labs/tokenized-euros';
import { Rfq, toRfq } from '../models';
import { toRfqAccount } from '../accounts';
import {
  psyoptionsAmericanInstrumentProgram,
  psyoptionsAmericanInstrumentDataSerializer,
} from '../../psyoptionsAmericanInstrumentModule';
import {
  psyoptionsEuropeanInstrumentParser,
  psyoptionsEuropeanInstrumentProgram,
} from '../../psyoptionsEuropeanInstrumentModule';
import { getPages, convertRfqOutput, sortByActiveAndExpiry } from '../helpers';
import { RfqGpaBuilder } from '../RfqGpaBuilder';
import { Convergence } from '../../../Convergence';
import { SpotInstrumentDataSerializer } from '../../spotInstrumentModule';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '../../../types';
import { collateralMintCache } from '../../collateralModule';

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
  /** Optional array of Rfqs to search from. */
  rfqs?: Rfq[];

  /** The address of the mint account. */
  mintAddress: PublicKey;

  /** Optional number of RFQs to return per page. */
  rfqsPerPage?: number;

  /** Optional number of pages to return. */
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
      const { programs, commitment } = scope;
      const { rfqs, mintAddress, rfqsPerPage, numPages } = operation.input;
      scope.throwIfCanceled();

      const spotInstrumentProgram = convergence.programs().getSpotInstrument();

      const collateralMint = await collateralMintCache.get(convergence);
      const collateralMintDecimals = collateralMint.decimals;

      if (rfqs) {
        let rfqsByToken: Rfq[] = [];

        for (const rfq of rfqs) {
          if (rfq.quoteMint.toBase58() === mintAddress.toBase58()) {
            const convertedRfq = convertRfqOutput(rfq, collateralMintDecimals);

            rfqsByToken.push(convertedRfq);

            continue;
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
                const convertedRfq = convertRfqOutput(
                  rfq,
                  collateralMintDecimals
                );

                rfqsByToken.push(convertedRfq);

                break;
              }
            } else if (
              leg.instrumentProgram.toBase58() ===
              psyoptionsEuropeanInstrumentProgram.address.toBase58()
            ) {
              const instrument =
                await psyoptionsEuropeanInstrumentParser.parseFromLeg(
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
                const convertedRfq = convertRfqOutput(
                  rfq,
                  collateralMintDecimals
                );

                rfqsByToken.push(convertedRfq);

                break;
              }
            } else if (
              leg.instrumentProgram.toBase58() ===
              spotInstrumentProgram.address.toBase58()
            ) {
              const data = SpotInstrumentDataSerializer.deserialize(
                Buffer.from(leg.instrumentData)
              )[0];

              if (data.mintAddress.toBase58() === mintAddress.toBase58()) {
                const convertedRfq = convertRfqOutput(
                  rfq,
                  collateralMintDecimals
                );

                rfqsByToken.push(convertedRfq);

                break;
              }
            }
          }
        }
        scope.throwIfCanceled();

        rfqsByToken = sortByActiveAndExpiry(rfqsByToken);

        const pages = getPages(rfqsByToken, rfqsPerPage, numPages);

        return pages;
      }

      const rfqProgram = convergence.programs().getRfq(programs);
      const rfqGpaBuilder = new RfqGpaBuilder(convergence, rfqProgram.address);
      const unparsedAccounts = await rfqGpaBuilder.withoutData().get();
      const unparsedAddresses = unparsedAccounts.map(
        (account) => account.publicKey
      );
      scope.throwIfCanceled();

      const callsToGetMultipleAccounts = Math.ceil(
        unparsedAddresses.length / 100
      );

      let parsedRfqs: Rfq[] = [];

      for (let i = 0; i < callsToGetMultipleAccounts; i++) {
        const accounts = await convergence
          .rpc()
          .getMultipleAccounts(
            unparsedAddresses.slice(i * 100, (i + 1) * 100),
            commitment
          );

        for (const account of accounts) {
          const rfq = toRfq(toRfqAccount(account));

          if (rfq.quoteMint.toBase58() === mintAddress.toBase58()) {
            const convertedRfq = convertRfqOutput(rfq, collateralMintDecimals);

            parsedRfqs.push(convertedRfq);

            continue;
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
                const convertedRfq = convertRfqOutput(
                  rfq,
                  collateralMintDecimals
                );

                parsedRfqs.push(convertedRfq);

                break;
              }
            } else if (
              leg.instrumentProgram.toBase58() ===
              psyoptionsEuropeanInstrumentProgram.address.toBase58()
            ) {
              const instrument =
                await psyoptionsEuropeanInstrumentParser.parseFromLeg(
                  convergence,
                  leg
                );
              const euroMetaOptionMint = await convergence
                .tokens()
                .findMintByAddress({
                  address:
                    instrument.optionType === OptionType.CALL
                      ? instrument.meta.callOptionMint
                      : instrument.meta.putOptionMint,
                });
              if (
                euroMetaOptionMint.address.toBase58() === mintAddress.toBase58()
              ) {
                const convertedRfq = convertRfqOutput(
                  rfq,
                  collateralMintDecimals
                );

                parsedRfqs.push(convertedRfq);

                break;
              }
            } else if (
              leg.instrumentProgram.toBase58() ===
              spotInstrumentProgram.address.toBase58()
            ) {
              const data = SpotInstrumentDataSerializer.deserialize(
                Buffer.from(leg.instrumentData)
              )[0];

              if (data.mintAddress.toBase58() === mintAddress.toBase58()) {
                const convertedRfq = convertRfqOutput(
                  rfq,
                  collateralMintDecimals
                );

                parsedRfqs.push(convertedRfq);

                break;
              }
            }
          }
        }
      }

      parsedRfqs = sortByActiveAndExpiry(parsedRfqs);

      const pages = getPages(parsedRfqs, rfqsPerPage, numPages);

      return pages;
    },
  };
