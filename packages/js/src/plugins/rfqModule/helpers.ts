import type { PublicKey } from '@solana/web3.js';
import { Keypair } from '@solana/web3.js';
import { PROGRAM_ID as SPOT_INSTRUMENT_PROGRAM_ID } from '@convergence-rfq/spot-instrument';
import { PROGRAM_ID as PSYOPTIONS_EUROPEAN_INSTRUMENT_PROGRAM_ID } from '@convergence-rfq/psyoptions-european-instrument';
import { spotInstrumentProgram, SpotInstrument } from '../spotInstrumentModule';
import {
  PsyoptionsEuropeanInstrument,
  psyoptionsEuropeanInstrumentProgram,
} from '../psyoptionsEuropeanInstrumentModule';
import { PsyoptionsAmericanInstrument } from '../psyoptionsAmericanInstrumentModule/models/PsyoptionsAmericanInstrument';
import { psyoptionsAmericanInstrumentProgram } from '../psyoptionsAmericanInstrumentModule/programs';
import type { Rfq, Response } from './models';
import type { FixedSize, Leg, QuoteAsset } from './types';
import { Convergence } from '@/Convergence';
import { UnparsedAccount, PublicKeyValues, token, toPublicKey } from '@/types';
import { Sha256 } from '@aws-crypto/sha256-js';

export type HasMintAddress = Rfq | PublicKey;

export const toMintAddress = (
  value: PublicKeyValues | HasMintAddress
): PublicKey => {
  return toPublicKey(value);
};

/**
 * Take a user and create a wallet for each base asset and collateral asset if not already
 * present. Then mint tokens for devnet usage.
 *
 * @param cvg
 * @param user
 * @returns
 */
export const devnetAirdrops = async (
  cvg: Convergence,
  user: PublicKey,
  mintAuthority?: Keypair
): Promise<{ collateralWallet: any; registeredMintWallets: any[] }> => {
  mintAuthority =
    mintAuthority ??
    Keypair.fromSecretKey(
      new Uint8Array([
        195, 171, 187, 206, 150, 223, 15, 222, 66, 189, 14, 34, 241, 1, 26, 95,
        251, 154, 99, 221, 244, 134, 82, 234, 114, 163, 221, 151, 53, 171, 209,
        189, 41, 58, 183, 52, 123, 23, 211, 220, 156, 60, 205, 23, 9, 11, 51,
        252, 184, 116, 167, 109, 174, 140, 100, 91, 157, 252, 202, 152, 61, 246,
        84, 87,
      ])
    );

  const protocol = await cvg.protocol().get();
  const collateralMint = await cvg
    .tokens()
    .findMintByAddress({ address: protocol.collateralMint });

  let collateralWallet;
  try {
    const { token: wallet } = await cvg
      .tokens()
      .createToken({ mint: collateralMint.address, owner: user });
    collateralWallet = wallet;
  } catch {
    const address = cvg
      .tokens()
      .pdas()
      .associatedTokenAccount({ mint: collateralMint.address, owner: user });
    collateralWallet = await cvg.tokens().findTokenByAddress({ address });
  }

  await cvg.tokens().mint({
    mintAddress: collateralMint.address,
    amount: token(1_000_000, collateralMint.decimals),
    toToken: collateralWallet.address,
    mintAuthority,
  });

  const registeredMintWallets = [];
  const registeredMints = await cvg.protocol().getRegisteredMints();

  for (const index in registeredMints) {
    const registeredMint = registeredMints[index];
    let registeredMintWallet;

    try {
      const { token: wallet } = await cvg
        .tokens()
        .createToken({ mint: registeredMint.mintAddress, owner: user });
      registeredMintWallet = wallet;
    } catch {
      const address = cvg.tokens().pdas().associatedTokenAccount({
        mint: registeredMint.mintAddress,
        owner: user,
      });
      registeredMintWallet = await cvg.tokens().findTokenByAddress({ address });
    }

    registeredMintWallets.push(registeredMintWallet);

    await cvg.tokens().mint({
      mintAddress: registeredMint.mintAddress,
      amount: token(1_000_000, registeredMint.decimals),
      toToken: registeredMintWallet.address,
      mintAuthority,
    });
  }

  return {
    collateralWallet,
    registeredMintWallets,
  };
};

export const legsToInstruments = async (
  convergence: Convergence,
  legs: Leg[]
): Promise<
  (
    | SpotInstrument
    | PsyoptionsEuropeanInstrument
    | PsyoptionsAmericanInstrument
  )[]
> => {
  return await Promise.all(
    legs.map(async (leg: Leg) => {
      if (leg.instrumentProgram.equals(spotInstrumentProgram.address)) {
        return await SpotInstrument.createFromLeg(convergence, leg);
      } else if (
        leg.instrumentProgram.equals(
          psyoptionsEuropeanInstrumentProgram.address
        )
      ) {
        return await PsyoptionsEuropeanInstrument.createFromLeg(
          convergence,
          leg
        );
      } else if (
        leg.instrumentProgram.equals(
          psyoptionsAmericanInstrumentProgram.address
        )
      ) {
        return await PsyoptionsAmericanInstrument.createFromLeg(
          convergence,
          leg
        );
      }

      throw new Error('Unsupported instrument program');
    })
  );
};

export const quoteAssetToInstrument = async (
  convergence: Convergence,
  quoteAsset: QuoteAsset
): Promise<SpotInstrument | PsyoptionsEuropeanInstrument> => {
  if (quoteAsset.instrumentProgram.equals(SPOT_INSTRUMENT_PROGRAM_ID)) {
    const { mint: mintPublicKey } = SpotInstrument.deserializeInstrumentData(
      Buffer.from(quoteAsset.instrumentData)
    );
    const mint = await convergence
      .tokens()
      .findMintByAddress({ address: mintPublicKey });
    return new SpotInstrument(convergence, mint);
  } else if (
    quoteAsset.instrumentProgram.equals(
      PSYOPTIONS_EUROPEAN_INSTRUMENT_PROGRAM_ID
    )
  ) {
    const { optionType, metaKey } =
      PsyoptionsEuropeanInstrument.deserializeInstrumentData(
        Buffer.from(quoteAsset.instrumentData)
      );
    const meta = await PsyoptionsEuropeanInstrument.fetchMeta(
      convergence,
      metaKey
    );
    const mint = await convergence
      .tokens()
      .findMintByAddress({ address: meta.underlyingMint });
    return new PsyoptionsEuropeanInstrument(
      convergence,
      mint,
      optionType,
      meta,
      metaKey
    );
  }
  throw new Error("Instrument doesn't exist");
};

export const getPages = (
  unparsedAccounts: UnparsedAccount[],
  rfqsPerPage: number,
  numPages?: number
): UnparsedAccount[][] => {
  let unparsedAccountPages: UnparsedAccount[][] = [];

  let lastPageSize = rfqsPerPage;

  if (numPages) {
    for (let i = 0; i < numPages; i++) {
      if (lastPageSize < rfqsPerPage) {
        return unparsedAccountPages;
      }
      lastPageSize = unparsedAccounts.slice(
        i * rfqsPerPage,
        (i + 1) * rfqsPerPage
      ).length;

      unparsedAccountPages.push(
        unparsedAccounts.slice(i * rfqsPerPage, (i + 1) * rfqsPerPage)
      );
    }
  } else {
    while (lastPageSize == rfqsPerPage) {
      lastPageSize = unparsedAccounts.slice(
        unparsedAccountPages.length * rfqsPerPage,
        (unparsedAccountPages.length + 1) * rfqsPerPage
      ).length;

      unparsedAccountPages.push(
        unparsedAccounts.slice(
          unparsedAccountPages.length * rfqsPerPage,
          (unparsedAccountPages.length + 1) * rfqsPerPage
        )
      );
    }
  }

  return unparsedAccountPages;
};

export const convertFixedSizeInput = (
  fixedSize: FixedSize,
  quoteAsset: QuoteAsset
): FixedSize => {
  if (fixedSize.__kind == 'BaseAsset') {
    const parsedLegsMultiplierBps =
      (fixedSize.legsMultiplierBps as number) * Math.pow(10, 9);
    fixedSize.legsMultiplierBps = parsedLegsMultiplierBps;
  } else if (fixedSize.__kind == 'QuoteAsset') {
    const parsedQuoteAmount =
      (fixedSize.quoteAmount as number) *
      Math.pow(10, quoteAsset.instrumentDecimals);
    fixedSize.quoteAmount = parsedQuoteAmount;
  }

  return fixedSize;
};

export const convertInstrumentsInput = (
  instruments: (
    | SpotInstrument
    | PsyoptionsEuropeanInstrument
    | PsyoptionsAmericanInstrument
  )[]
) => {
  for (const instrument of instruments) {
    if (instrument.legInfo?.amount) {
      instrument.legInfo.amount *= Math.pow(10, instrument.decimals);
    }
  }
  return instruments;
};

export const convertRfqOutput = async (
  convergence: Convergence,
  rfq: Rfq
): Promise<Rfq> => {
  if (rfq.fixedSize.__kind == 'BaseAsset') {
    const parsedLegsMultiplierBps =
      (rfq.fixedSize.legsMultiplierBps as number) / Math.pow(10, 9);

    rfq.fixedSize.legsMultiplierBps = parsedLegsMultiplierBps;
  } else if (rfq.fixedSize.__kind == 'QuoteAsset') {
    const parsedQuoteAmount =
      (rfq.fixedSize.quoteAmount as number) / Math.pow(10, 9);

    rfq.fixedSize.quoteAmount = parsedQuoteAmount;
  }

  const spotInstrumentProgram = convergence.programs().getSpotInstrument();
  const psyoptionsEuropeanProgram = convergence
    .programs()
    .getPsyoptionsEuropeanInstrument();
  const psyoptionsAmericanProgram = convergence
    .programs()
    .getPsyoptionsAmericanInstrument();

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
        leg.instrumentAmount = (leg.instrumentAmount as number) /= Math.pow(
          10,
          instrument.decimals
        );
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
        leg.instrumentAmount = (leg.instrumentAmount as number) /= Math.pow(
          10,
          instrument.decimals
        );
      }
    } else if (
      leg.instrumentProgram.toBase58() ===
      spotInstrumentProgram.address.toBase58()
    ) {
      const instrument = await SpotInstrument.createFromLeg(convergence, leg);

      if (instrument.legInfo?.amount) {
        leg.instrumentAmount = (leg.instrumentAmount as number) /= Math.pow(
          10,
          instrument.decimals
        );
      }
    }
  }

  return rfq;
};

export const convertResponseOutput = (response: Response): Response => {
  if (response.bid) {
    const parsedPriceQuoteAmountBps =
      (response.bid.priceQuote.amountBps as number) / Math.pow(10, 9);

    response.bid.priceQuote.amountBps = parsedPriceQuoteAmountBps;

    if (response.bid.__kind == 'Standard') {
      const parsedLegsMultiplierBps =
        (response.bid.legsMultiplierBps as number) / Math.pow(10, 9);

      response.bid.legsMultiplierBps = parsedLegsMultiplierBps;
    }
  }
  if (response.ask) {
    const parsedPriceQuoteAmountBps =
      (response.ask.priceQuote.amountBps as number) / Math.pow(10, 9);

    response.ask.priceQuote.amountBps = parsedPriceQuoteAmountBps;

    if (response.ask.__kind == 'Standard') {
      const parsedLegsMultiplierBps =
        (response.ask.legsMultiplierBps as number) / Math.pow(10, 9);

      response.ask.legsMultiplierBps = parsedLegsMultiplierBps;
    }
  }

  return response;
};

export const calculateExpectedLegsHash = async (
  convergence: Convergence,
  instruments: (
    | SpotInstrument
    | PsyoptionsEuropeanInstrument
    | PsyoptionsAmericanInstrument
  )[]
): Promise<Uint8Array> => {
  const serializedLegsData: Buffer[] = [];

  for (const instrument of instruments) {
    if (instrument.legInfo?.amount) {
      instrument.legInfo.amount *= Math.pow(10, instrument.decimals);
    }

    const instrumentClient = convergence.instrument(
      instrument,
      instrument.legInfo
    );

    const leg = await instrumentClient.toLegData();

    serializedLegsData.push(instrumentClient.serializeLegData(leg));
  }

  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeInt32LE(instruments.length);
  const fullLegDataBuffer = Buffer.concat([
    lengthBuffer,
    ...serializedLegsData,
  ]);

  const hash = new Sha256();
  hash.update(fullLegDataBuffer);
  const expectedLegsHash = hash.digestSync();

  return expectedLegsHash;
};

export const calculateExpectedLegsSize = async (
  convergence: Convergence,
  instruments: (
    | SpotInstrument
    | PsyoptionsEuropeanInstrument
    | PsyoptionsAmericanInstrument
  )[]
): Promise<number> => {
  let expectedLegsSize = 4;

  for (const instrument of instruments) {
    if (instrument.legInfo?.amount) {
      instrument.legInfo.amount *= Math.pow(10, instrument.decimals);
    }

    const instrumentClient = convergence.instrument(
      instrument,
      instrument.legInfo
    );
    expectedLegsSize += await instrumentClient.getLegDataSize();
  }

  return expectedLegsSize;
};
