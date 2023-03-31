import { PublicKey, AccountMeta, Keypair } from '@solana/web3.js';
import { Sha256 } from '@aws-crypto/sha256-js';
import { PROGRAM_ID as SPOT_INSTRUMENT_PROGRAM_ID } from '@convergence-rfq/spot-instrument';
import { PROGRAM_ID as PSYOPTIONS_EUROPEAN_INSTRUMENT_PROGRAM_ID } from '@convergence-rfq/psyoptions-european-instrument';
import { Quote, Side, Leg, FixedSize, QuoteAsset, StoredRfqState } from '@convergence-rfq/rfq';
import * as anchor from '@project-serum/anchor';
import * as psyoptionsAmerican from '@mithraic-labs/psy-american';
import { OptionMarketWithKey } from '@mithraic-labs/psy-american';
import {
  instructions,
  EuroPrimitive,
  EuroMeta,
  createProgram,
  OptionType,
  programId as psyoptionsEuropeanProgramId,
} from '@mithraic-labs/tokenized-euros';
import {
  UnparsedAccount,
  PublicKeyValues,
  token,
  toPublicKey,
  toBigNumber,
  Pda,
  makeConfirmOptionsFinalizedOnMainnet,
  Program,
} from '../../types';
import { CvgWallet, TransactionBuilder } from '../../utils';
import { Convergence } from '../../Convergence';
import { spotInstrumentProgram, SpotInstrument } from '../spotInstrumentModule';
import {
  PsyoptionsEuropeanInstrument,
  psyoptionsEuropeanInstrumentProgram,
} from '../psyoptionsEuropeanInstrumentModule';
import { PsyoptionsAmericanInstrument } from '../psyoptionsAmericanInstrumentModule/models/PsyoptionsAmericanInstrument';
import { psyoptionsAmericanInstrumentProgram } from '../psyoptionsAmericanInstrumentModule/programs';
import { Mint } from '../tokenModule';
import type { Rfq, Response } from './models';
import { ABSOLUTE_PRICE_DECIMALS, LEG_MULTIPLIER_DECIMALS } from './constants';
// import { CvgWallet } from '@/utils/CvgWallet';

const { mintOptions } = instructions;

const { initializeAllAccountsInstructions, createEuroMetaInstruction } =
  instructions;

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

export const faucetAirdropWithMint = async (
  cvg: Convergence,
  user: PublicKey,
  mintAddress: PublicKey,
  mintDecimals: number
) => {
  let TokenWallet;
  const mintAuthority = Keypair.fromSecretKey(
    new Uint8Array([
      195, 171, 187, 206, 150, 223, 15, 222, 66, 189, 14, 34, 241, 1, 26, 95,
      251, 154, 99, 221, 244, 134, 82, 234, 114, 163, 221, 151, 53, 171, 209,
      189, 41, 58, 183, 52, 123, 23, 211, 220, 156, 60, 205, 23, 9, 11, 51, 252,
      184, 116, 167, 109, 174, 140, 100, 91, 157, 252, 202, 152, 61, 246, 84,
      87,
    ])
  );
  try {
    const { token: wallet } = await cvg
      .tokens()
      .createToken({ mint: mintAddress, owner: user });
    TokenWallet = wallet;
  } catch {
    const address = cvg.tokens().pdas().associatedTokenAccount({
      mint: mintAddress,
      owner: user,
    });
    TokenWallet = await cvg.tokens().findTokenByAddress({ address });
  }
  await cvg.tokens().mint({
    mintAddress,
    amount: token(1_000_000, mintDecimals),
    toToken: TokenWallet.address,
    mintAuthority,
  });
};

export async function legToInstrument<
  T extends
    | SpotInstrument
    | PsyoptionsEuropeanInstrument
    | PsyoptionsAmericanInstrument
>(convergence: Convergence, leg: Leg): Promise<T> {
  if (leg.instrumentProgram.equals(spotInstrumentProgram.address)) {
    return (await SpotInstrument.createFromLeg(convergence, leg)) as T;
  } else if (
    leg.instrumentProgram.equals(psyoptionsEuropeanInstrumentProgram.address)
  ) {
    return (await PsyoptionsEuropeanInstrument.createFromLeg(
      convergence,
      leg
    )) as T;
  } else if (
    leg.instrumentProgram.equals(psyoptionsAmericanInstrumentProgram.address)
  ) {
    return (await PsyoptionsAmericanInstrument.createFromLeg(
      convergence,
      leg
    )) as T;
  }

  throw new Error('Unsupported instrument program');
}

export async function legsToInstruments<
  T extends
    | SpotInstrument
    | PsyoptionsEuropeanInstrument
    | PsyoptionsAmericanInstrument
>(convergence: Convergence, legs: Leg[]): Promise<T[]> {
  return await Promise.all(
    legs.map(async (leg: Leg) => {
      return await legToInstrument<T>(convergence, leg);
    })
  );
}

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

export function getPages<T extends UnparsedAccount | Rfq | Response>(
  accounts: T[],
  itemsPerPage?: number,
  numPages?: number
): T[][] {
  const pages: T[][] = [];
  const totalCount = accounts.length;

  if (itemsPerPage) {
    const totalPages = numPages ?? Math.ceil(totalCount / itemsPerPage);

    for (let i = 0; i < totalPages; i++) {
      const startIndex = i * itemsPerPage;
      const page = accounts.slice(startIndex, startIndex + itemsPerPage);
      pages.push(page);
    }
  } else if (numPages && !itemsPerPage) {
    const itemsPerPage = 10;

    for (let i = 0; i < numPages; i++) {
      const startIndex = i * itemsPerPage;
      const page = accounts.slice(startIndex, startIndex + itemsPerPage);
      pages.push(page);
    }
  } else {
    pages.push(accounts);
  }

  return pages as T[][];
}

export const convertOverrideLegMultiplierBps = (
  overrideLegMultiplierBps: number
): number => {
  return overrideLegMultiplierBps * Math.pow(10, 9);
};

export const convertFixedSizeInput = (
  fixedSize: FixedSize,
  quoteAsset: QuoteAsset
): FixedSize => {
  if (fixedSize.__kind == 'BaseAsset') {
    const convertedLegsMultiplierBps =
      Number(fixedSize.legsMultiplierBps) *
      Math.pow(10, LEG_MULTIPLIER_DECIMALS);

    fixedSize.legsMultiplierBps = convertedLegsMultiplierBps;
  } else if (fixedSize.__kind == 'QuoteAsset') {
    const convertedQuoteAmount =
      Number(fixedSize.quoteAmount) *
      Math.pow(10, quoteAsset.instrumentDecimals);

    fixedSize.quoteAmount = convertedQuoteAmount;
  }

  return fixedSize;
};

export const convertRfqOutput = (
  rfq: Rfq,
  collateralMintDecimals: number
): Rfq => {
  rfq.nonResponseTakerCollateralLocked =
    Number(rfq.nonResponseTakerCollateralLocked) /
    Math.pow(10, collateralMintDecimals);
  rfq.totalTakerCollateralLocked =
    Number(rfq.totalTakerCollateralLocked) /
    Math.pow(10, collateralMintDecimals);

  if (rfq.fixedSize.__kind == 'BaseAsset') {
    const parsedLegsMultiplierBps =
      Number(rfq.fixedSize.legsMultiplierBps) /
      Math.pow(10, LEG_MULTIPLIER_DECIMALS);

    rfq.fixedSize.legsMultiplierBps = parsedLegsMultiplierBps;
  } else if (rfq.fixedSize.__kind == 'QuoteAsset') {
    const parsedQuoteAmount =
      Number(rfq.fixedSize.quoteAmount) /
      Math.pow(10, rfq.quoteAsset.instrumentDecimals);

    rfq.fixedSize.quoteAmount = parsedQuoteAmount;
  }

  for (const leg of rfq.legs) {
    leg.instrumentAmount =
      Number(leg.instrumentAmount) / Math.pow(10, leg.instrumentDecimals);
  }

  return rfq;
};

export const convertResponseOutput = (
  response: Response,
  quoteDecimals: number
): Response => {
  // let convertedResponse = structuredClone(response);

  if (response.bid) {
    let convertedPriceQuoteAmountBps =
      response.bid.priceQuote.amountBps instanceof anchor.BN
        ? response.bid.priceQuote.amountBps
        : new anchor.BN(response.bid.priceQuote.amountBps);

    convertedPriceQuoteAmountBps = convertedPriceQuoteAmountBps.div(
      new anchor.BN(10).pow(
        new anchor.BN(quoteDecimals + ABSOLUTE_PRICE_DECIMALS)
      )
    );

    response.bid.priceQuote.amountBps = convertedPriceQuoteAmountBps;

    if (response.bid.__kind == 'Standard') {
      let convertedLegsMultiplierBps =
        response.bid.legsMultiplierBps instanceof anchor.BN
          ? response.bid.legsMultiplierBps
          : new anchor.BN(response.bid.legsMultiplierBps);

      convertedLegsMultiplierBps = convertedLegsMultiplierBps.div(
        new anchor.BN(10).pow(new anchor.BN(LEG_MULTIPLIER_DECIMALS))
      );

      response.bid.legsMultiplierBps = convertedLegsMultiplierBps;
    }
  }
  if (response.ask) {
    let convertedPriceQuoteAmountBps =
      response.ask.priceQuote.amountBps instanceof anchor.BN
        ? response.ask.priceQuote.amountBps
        : new anchor.BN(response.ask.priceQuote.amountBps);

    convertedPriceQuoteAmountBps = convertedPriceQuoteAmountBps.div(
      new anchor.BN(10).pow(
        new anchor.BN(quoteDecimals + ABSOLUTE_PRICE_DECIMALS)
      )
    );

    response.ask.priceQuote.amountBps = convertedPriceQuoteAmountBps;

    if (response.ask.__kind == 'Standard') {
      let convertedLegsMultiplierBps =
        response.ask.legsMultiplierBps instanceof anchor.BN
          ? response.ask.legsMultiplierBps
          : new anchor.BN(response.ask.legsMultiplierBps);

      convertedLegsMultiplierBps = convertedLegsMultiplierBps.div(
        new anchor.BN(10).pow(new anchor.BN(LEG_MULTIPLIER_DECIMALS))
      );

      response.ask.legsMultiplierBps = convertedLegsMultiplierBps;
    }
  }

  return response;
};

const convertQuoteInput = (quote: Quote | undefined, quoteDecimals: number) => {
  if (!quote) return;

  const convertedQuote = structuredClone(quote);
  convertedQuote.priceQuote.amountBps = quote.priceQuote.amountBps;

  let convertedPriceQuoteAmountBps =
    convertedQuote.priceQuote.amountBps instanceof anchor.BN
      ? convertedQuote.priceQuote.amountBps
      : new anchor.BN(convertedQuote.priceQuote.amountBps);

  convertedQuote.priceQuote.amountBps = convertedPriceQuoteAmountBps.mul(
    new anchor.BN(Math.pow(10, quoteDecimals + ABSOLUTE_PRICE_DECIMALS))
  );

  if (convertedQuote.__kind == 'Standard') {
    let convertedLegsMultiplierBps =
      convertedQuote.legsMultiplierBps instanceof anchor.BN
        ? convertedQuote.legsMultiplierBps
        : new anchor.BN(convertedQuote.legsMultiplierBps);

    convertedQuote.legsMultiplierBps = convertedLegsMultiplierBps.mul(
      new anchor.BN(Math.pow(10, LEG_MULTIPLIER_DECIMALS))
    );
  }

  return convertedQuote;
};

export const convertResponseInput = (
  quoteDecimals: number,
  bid?: Quote,
  ask?: Quote
) => {
  const convertedBid = convertQuoteInput(bid, quoteDecimals);
  const convertedAsk = convertQuoteInput(ask, quoteDecimals);

  return { convertedBid, convertedAsk };
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
    const instrumentClient = convergence.instrument(
      instrument,
      instrument.legInfo
    );
    expectedLegsSize += await instrumentClient.getLegDataSize();
  }

  return expectedLegsSize;
};

export const instrumentsToLegsAndLegsSize = async (
  convergence: Convergence,
  instruments: (
    | SpotInstrument
    | PsyoptionsEuropeanInstrument
    | PsyoptionsAmericanInstrument
  )[]
): Promise<[Leg[], number]> => {
  const legs: Leg[] = [];
  let legsSize = 4;

  for (const instrument of instruments) {
    const instrumentClient = convergence.instrument(
      instrument,
      instrument.legInfo
    );

    const leg = await instrumentClient.toLegData();
    legs.push(leg);

    legsSize += instrumentClient.serializeLegData(leg).length;
  }

  return [legs, legsSize];
};

export const instrumentsToLegs = async (
  convergence: Convergence,
  instruments: (
    | SpotInstrument
    | PsyoptionsEuropeanInstrument
    | PsyoptionsAmericanInstrument
  )[]
): Promise<Leg[]> => {
  const legs: Leg[] = [];

  for (const instrument of instruments) {
    const instrumentClient = convergence.instrument(
      instrument,
      instrument.legInfo
    );

    const leg = await instrumentClient.toLegData();

    legs.push(leg);
  }

  return legs;
};

export const instrumentsToLegsAndExpectedLegsHash = async (
  convergence: Convergence,
  instruments: (
    | SpotInstrument
    | PsyoptionsEuropeanInstrument
    | PsyoptionsAmericanInstrument
  )[]
): Promise<[Leg[], Uint8Array]> => {
  const legs: Leg[] = [];
  const serializedLegsData: Buffer[] = [];

  for (const instrument of instruments) {
    const instrumentClient = convergence.instrument(
      instrument,
      instrument.legInfo
    );

    const leg = await instrumentClient.toLegData();

    legs.push(leg);
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

  return [legs, expectedLegsHash];
};

export const legsToBaseAssetAccounts = (
  convergence: Convergence,
  legs: Leg[]
): AccountMeta[] => {
  const baseAssetAccounts: AccountMeta[] = [];

  for (const leg of legs) {
    const baseAsset = convergence
      .protocol()
      .pdas()
      .baseAsset({ index: { value: leg.baseAssetIndex.value } });

    const baseAssetAccount: AccountMeta = {
      pubkey: baseAsset,
      isSigner: false,
      isWritable: false,
    };

    baseAssetAccounts.push(baseAssetAccount);
  }

  return baseAssetAccounts;
};

export const instrumentsToLegAccounts = (
  convergence: Convergence,
  instruments: (
    | SpotInstrument
    | PsyoptionsEuropeanInstrument
    | PsyoptionsAmericanInstrument
  )[]
): AccountMeta[] => {
  const legAccounts: AccountMeta[] = [];

  for (const instrument of instruments) {
    const instrumentClient = convergence.instrument(
      instrument,
      instrument.legInfo
    );

    legAccounts.push(...instrumentClient.getValidationAccounts());
  }

  return legAccounts;
};

export const initializeNewOptionMeta = async (
  convergence: Convergence,
  oracle: PublicKey,
  europeanProgram: anchor.Program<EuroPrimitive>,
  underlyingMint: Mint,
  stableMint: Mint,
  strikePrice: number,
  underlyingAmountPerContract: number,
  expiresIn: number,
  oracleProviderId = 1
) => {
  const expiration = new anchor.BN(Date.now() / 1_000 + expiresIn);

  let { instructions: initializeIxs } = await initializeAllAccountsInstructions(
    europeanProgram,
    underlyingMint.address,
    stableMint.address,
    oracle,
    expiration,
    stableMint.decimals,
    oracleProviderId
  );

  const tx = TransactionBuilder.make();

  const underlyingPoolKey = Pda.find(europeanProgram.programId, [
    underlyingMint.address.toBuffer(),
    Buffer.from('underlyingPool', 'utf-8'),
  ]);
  const underlyingPoolAccount = await convergence.connection.getAccountInfo(
    underlyingPoolKey
  );
  if (underlyingPoolAccount && initializeIxs.length === 3) {
    initializeIxs = initializeIxs.slice(1);
  }
  const stablePoolKey = Pda.find(europeanProgram.programId, [
    stableMint.address.toBuffer(),
    Buffer.from('stablePool', 'utf-8'),
  ]);
  const stablePoolAccount = await convergence.connection.getAccountInfo(
    stablePoolKey
  );
  if (stablePoolAccount && initializeIxs.length === 2) {
    initializeIxs = initializeIxs.slice(1);
  } else if (stablePoolAccount && initializeIxs.length === 3) {
    initializeIxs.splice(1, 1);
  }

  initializeIxs.forEach((ix) => {
    tx.add({ instruction: ix, signers: [] });
  });

  const confirmOptions = makeConfirmOptionsFinalizedOnMainnet(convergence);

  if (initializeIxs.length > 0) {
    await tx.sendAndConfirm(convergence, confirmOptions);
  }

  strikePrice *= Math.pow(10, stableMint.decimals);
  underlyingAmountPerContract *= Math.pow(10, underlyingMint.decimals);

  const {
    instruction: createIx,
    euroMeta,
    euroMetaKey,
    expirationData,
  } = await createEuroMetaInstruction(
    europeanProgram,
    underlyingMint.address,
    underlyingMint.decimals,
    stableMint.address,
    stableMint.decimals,
    expiration,
    toBigNumber(underlyingAmountPerContract),
    toBigNumber(strikePrice),
    stableMint.decimals,
    oracle,
    oracleProviderId
  );

  await TransactionBuilder.make()
    .add({ instruction: createIx, signers: [] })
    .sendAndConfirm(convergence);

  return {
    euroMeta,
    euroMetaKey,
    expirationData,
  };
};

export const initializeNewAmericanOption = async (
  convergence: Convergence,
  americanProgram: any,
  underlyingMint: Mint,
  quoteMint: Mint,
  quoteAmountPerContract: anchor.BN,
  underlyingAmountPerContract: anchor.BN,
  expiresIn: number
) => {
  const expiration = new anchor.BN(Date.now() / 1_000 + expiresIn);

  quoteAmountPerContract = new anchor.BN(
    Number(quoteAmountPerContract) * Math.pow(10, quoteMint.decimals)
  );
  underlyingAmountPerContract = new anchor.BN(
    Number(underlyingAmountPerContract) * Math.pow(10, underlyingMint.decimals)
  );

  const { optionMarketKey, optionMintKey, writerMintKey } =
    await psyoptionsAmerican.instructions.initializeMarket(americanProgram, {
      expirationUnixTimestamp: expiration,
      quoteAmountPerContract,
      quoteMint: quoteMint.address,
      underlyingAmountPerContract,
      underlyingMint: underlyingMint.address,
    });

  const optionMarket = (await psyoptionsAmerican.getOptionByKey(
    americanProgram,
    optionMarketKey
  )) as OptionMarketWithKey;

  const optionMint = await convergence
    .tokens()
    .findMintByAddress({ address: optionMintKey });

  return {
    optionMarketKey,
    optionMarket,
    optionMintKey,
    writerMintKey,
    optionMint,
  };
};

export const createEuropeanProgram = async (convergence: Convergence) => {
  return createProgram(
    convergence.rpc().getDefaultFeePayer() as Keypair,
    convergence.connection.rpcEndpoint,
    new PublicKey(psyoptionsEuropeanProgramId)
  );
};

export const createAmericanProgram = (convergence: Convergence): any => {
  const psyOptionsAmericanLocalNetProgramId = new anchor.web3.PublicKey(
    'R2y9ip6mxmWUj4pt54jP2hz2dgvMozy9VTSwMWE7evs'
  );
  const provider = new anchor.AnchorProvider(
    convergence.connection,
    new CvgWallet(convergence),
    {}
  );

  const americanProgram = psyoptionsAmerican.createProgram(
    psyOptionsAmericanLocalNetProgramId,
    provider
  );

  return americanProgram;
};

export const getOrCreateATA = async (
  convergence: Convergence,
  mint: PublicKey,
  owner: PublicKey,
  programs?: Program[]
): Promise<PublicKey> => {
  const pda = convergence.tokens().pdas().associatedTokenAccount({
    mint,
    owner,
    programs,
  });
  const account = await convergence.rpc().getAccount(pda);

  const ata = account.exists
    ? pda
    : (
        await convergence.tokens().createToken({
          mint,
          owner,
        })
      ).token.address;

  return ata;
};

export const createEuroAccountsAndMintOptions = async (
  convergence: Convergence,
  caller: Keypair, // TODO: not needed when we return the tx
  rfqAddress: PublicKey,
  europeanProgram: anchor.Program<EuroPrimitive>,
  amount: number
) => {
  const rfq = await convergence
    .rfqs()
    .findRfqByAddress({ address: rfqAddress });

  for (const leg of rfq.legs) {
    if (
      leg.instrumentProgram.equals(psyoptionsEuropeanInstrumentProgram.address)
    ) {
      const instrumentData =
        PsyoptionsEuropeanInstrument.deserializeInstrumentData(
          Buffer.from(leg.instrumentData)
        );

      const euroMetaKey = instrumentData.metaKey;
      const euroMeta = await PsyoptionsEuropeanInstrument.fetchMeta(
        convergence,
        euroMetaKey
      );
      const { optionType } = instrumentData;
      const { stableMint, underlyingMint } = euroMeta;
      const stableMintToken = convergence
        .tokens()
        .pdas()
        .associatedTokenAccount({
          mint: stableMint,
          owner: caller.publicKey,
        });

      const underlyingMintToken = convergence
        .tokens()
        .pdas()
        .associatedTokenAccount({
          mint: underlyingMint,
          owner: caller.publicKey,
        });
      const minterCollateralKey =
        optionType == OptionType.PUT ? stableMintToken : underlyingMintToken;

      const optionDestination = await getOrCreateATA(
        convergence,
        optionType == OptionType.PUT
          ? euroMeta.putOptionMint
          : euroMeta.callOptionMint,
        caller.publicKey
      );
      const writerDestination = await getOrCreateATA(
        convergence,
        optionType == OptionType.PUT
          ? euroMeta.putWriterMint
          : euroMeta.callWriterMint,
        caller.publicKey
      );

      const { instruction: ix1 } = mintOptions(
        europeanProgram,
        euroMetaKey,
        euroMeta as EuroMeta,
        minterCollateralKey,
        optionDestination,
        writerDestination,
        new anchor.BN(amount),
        optionType
      );

      ix1.keys[0] = {
        pubkey: caller.publicKey,
        isSigner: true,
        isWritable: false,
      };

      const txBuilder = TransactionBuilder.make().setFeePayer(
        convergence.rpc().getDefaultFeePayer()
      );

      txBuilder.add({
        instruction: ix1,
        signers: [caller],
      });

      const confirmOptions = makeConfirmOptionsFinalizedOnMainnet(convergence);

      await txBuilder.sendAndConfirm(convergence, confirmOptions);
    }
  }
};

export const getCreateEuroAccountsAndMintOptionsTransaction = async (
  convergence: Convergence,
  caller: PublicKey,
  rfqAddress: PublicKey,
  europeanProgram: anchor.Program<EuroPrimitive>,
  amount: number
): Promise<anchor.web3.Transaction> => {
  const rfq = await convergence
    .rfqs()
    .findRfqByAddress({ address: rfqAddress });

  const EURO_DECIMALS = 4;
  amount *= Math.pow(10, EURO_DECIMALS);

  const instructions: anchor.web3.TransactionInstruction[] = [];

  for (const leg of rfq.legs) {
    if (
      leg.instrumentProgram.equals(psyoptionsEuropeanInstrumentProgram.address)
    ) {
      const instrumentData =
        PsyoptionsEuropeanInstrument.deserializeInstrumentData(
          Buffer.from(leg.instrumentData)
        );

      const euroMetaKey = instrumentData.metaKey;
      const euroMeta = await PsyoptionsEuropeanInstrument.fetchMeta(
        convergence,
        euroMetaKey
      );
      const { optionType } = instrumentData;
      const { stableMint, underlyingMint } = euroMeta;
      const stableMintToken = convergence
        .tokens()
        .pdas()
        .associatedTokenAccount({
          mint: stableMint,
          owner: caller,
        });
      const underlyingMintToken = convergence
        .tokens()
        .pdas()
        .associatedTokenAccount({
          mint: underlyingMint,
          owner: caller,
        });
      const minterCollateralKey =
        optionType == OptionType.PUT ? stableMintToken : underlyingMintToken;

      const optionDestination = await getOrCreateATA(
        convergence,
        optionType == OptionType.PUT
          ? euroMeta.putOptionMint
          : euroMeta.callOptionMint,
        caller
      );
      const writerDestination = await getOrCreateATA(
        convergence,
        optionType == OptionType.PUT
          ? euroMeta.putWriterMint
          : euroMeta.callWriterMint,
        caller
      );

      const { instruction: ix } = mintOptions(
        europeanProgram,
        euroMetaKey,
        //@ts-ignore
        euroMeta,
        minterCollateralKey,
        optionDestination,
        writerDestination,
        new anchor.BN(amount),
        optionType
      );

      ix.keys[0] = {
        pubkey: caller,
        isSigner: true,
        isWritable: false,
      };

      instructions.push(ix);
    }
  }

  const tx = new anchor.web3.Transaction();
  tx.instructions = instructions;

  const recentBlockhash = await convergence.connection.getRecentBlockhash();
  tx.recentBlockhash = recentBlockhash.blockhash;

  return tx;
};

export const getCreateAmericanAccountsAndMintOptionsTransaction = async (
  convergence: Convergence,
  rfqAddress: PublicKey,
  caller: PublicKey,
  optionMarket: any,
  americanProgram: any,
  amount: number
): Promise<anchor.web3.Transaction> => {
  const rfq = await convergence
    .rfqs()
    .findRfqByAddress({ address: rfqAddress });
  const callerIsTaker = caller == rfq.taker;

  const AMERICAN_DECIMALS = 0;
  amount *= Math.pow(10, AMERICAN_DECIMALS);

  const instructions: anchor.web3.TransactionInstruction[] = [];

  for (const leg of rfq.legs) {
    const instrument = await legToInstrument(convergence, leg);

    if (
      (instrument.legInfo?.side == Side.Bid && callerIsTaker) ||
      (instrument.legInfo?.side == Side.Ask && !callerIsTaker)
    ) {
      if (
        leg.instrumentProgram.equals(
          psyoptionsAmericanInstrumentProgram.address
        )
      ) {
        const instrumentData =
          PsyoptionsAmericanInstrument.deserializeInstrumentData(
            Buffer.from(leg.instrumentData)
          );

        const { metaKey } = instrumentData;
        const meta = await PsyoptionsAmericanInstrument.fetchMeta(
          convergence,
          metaKey
        );
        const optionMintKey = meta.optionMint;
        const writerMintKey = meta.writerTokenMint;
        const underlyingMint = meta.underlyingAssetMint;

        const optionToken = await getOrCreateATA(
          convergence,
          optionMintKey,
          caller
        );
        const writerToken = await getOrCreateATA(
          convergence,
          writerMintKey,
          caller
        );
        const underlyingToken = await getOrCreateATA(
          convergence,
          underlyingMint,
          caller
        );

        const ixWithSigners =
          await psyoptionsAmerican.instructions.mintOptionV2Instruction(
            americanProgram,
            optionToken,
            writerToken,
            underlyingToken,
            new anchor.BN(amount),
            optionMarket
          );
        const { ix } = ixWithSigners;

        instructions.push(ix);
      }
    }
  }
  const tx = new anchor.web3.Transaction();
  tx.instructions = instructions;

  const recentBlockhash = await convergence.connection.getRecentBlockhash();
  tx.recentBlockhash = recentBlockhash.blockhash;

  return tx;
};

export const createAmericanAccountsAndMintOptions = async (
  convergence: Convergence,
  caller: Keypair,
  rfqAddress: PublicKey,
  americanProgram: any
) => {
  const rfq = await convergence
    .rfqs()
    .findRfqByAddress({ address: rfqAddress });

  for (const leg of rfq.legs) {
    const instrument = await legToInstrument(convergence, leg);

    if (
      leg.instrumentProgram.equals(psyoptionsAmericanInstrumentProgram.address)
    ) {
      const amount = instrument.legInfo?.amount;

      const instrumentData =
        PsyoptionsAmericanInstrument.deserializeInstrumentData(
          Buffer.from(leg.instrumentData)
        );
      const metaKey = instrumentData.metaKey;
      // const meta = await PsyoptionsAmericanInstrument.fetchMeta(
      //   convergence,
      //   metaKey
      // );
      const optionMarket = await psyoptionsAmerican.getOptionByKey(
        americanProgram,
        metaKey
      );
      // const optionMintKey = meta.optionMint;
      // const writerMintKey = meta.writerTokenMint;
      // const underlyingMint = meta.underlyingAssetMint;
      const optionToken = await getOrCreateATA(
        convergence,
        // optionMintKey,
        optionMarket!.optionMint,
        caller.publicKey
      );
      const writerToken = await getOrCreateATA(
        convergence,
        // writerMintKey,
        optionMarket!.writerTokenMint,
        caller.publicKey
      );
      const underlyingToken = await getOrCreateATA(
        convergence,
        // underlyingMint,
        optionMarket!.underlyingAssetMint,
        caller.publicKey
      );

      //---------------
      // const instrumentData =
      //   PsyoptionsAmericanInstrument.deserializeInstrumentData(
      //     Buffer.from(leg.instrumentData)
      //   );

      // const { metaKey } = instrumentData;
      // const meta = await PsyoptionsAmericanInstrument.fetchMeta(
      //   convergence,
      //   metaKey
      // );
      // const optionMintKey = meta.optionMint;
      // const writerMintKey = meta.writerTokenMint;
      // const underlyingMint = meta.underlyingAssetMint;

      // const optionToken = await getOrCreateATA(
      //   convergence,
      //   optionMintKey,
      //   caller.publicKey
      // );
      // const writerToken = await getOrCreateATA(
      //   convergence,
      //   writerMintKey,
      //   caller.publicKey
      // );
      // const underlyingToken = await getOrCreateATA(
      //   convergence,
      //   underlyingMint,
      //   caller.publicKey
      // );
      const ixWithSigners =
        await psyoptionsAmerican.instructions.mintOptionV2Instruction(
          americanProgram,
          optionToken,
          writerToken,
          underlyingToken,
          new anchor.BN(amount!),
          optionMarket as OptionMarketWithKey
        );
      const { ix } = ixWithSigners;

      ixWithSigners.signers.push(caller);

      ixWithSigners.ix.keys[0] = {
        pubkey: caller.publicKey,
        isSigner: true,
        isWritable: false,
      };

      const payer = convergence.rpc().getDefaultFeePayer();
      const txBuilder = TransactionBuilder.make().setFeePayer(payer);

      txBuilder.add({
        instruction: ix,
        signers: ixWithSigners.signers,
      });

      const confirmOptions = makeConfirmOptionsFinalizedOnMainnet(convergence);

      await txBuilder.sendAndConfirm(convergence, confirmOptions);
    }
  }
};

export const getCreateAccountsAndMintOptionsTransaction = async (
  convergence: Convergence,
  responseAddress: PublicKey,
  caller: PublicKey,
  europeanProgram: any,
  americanProgram: any
): Promise<anchor.web3.Transaction> => {
  const response = await convergence
    .rfqs()
    .findResponseByAddress({ address: responseAddress });
  const rfq = await convergence
    .rfqs()
    .findRfqByAddress({ address: response.rfq });
  const confirmedSide = response.confirmed?.side;

  const callerIsTaker = caller.toBase58() === rfq.taker.toBase58();
  const callerIsMaker = caller.toBase58() === response.maker.toBase58();

  const instructions: anchor.web3.TransactionInstruction[] = [];

  for (const leg of rfq.legs) {
    const instrument = await legToInstrument(convergence, leg);
    if (
      (instrument.legInfo?.side === confirmedSide && callerIsTaker) ||
      (instrument.legInfo?.side !== confirmedSide && callerIsMaker)
    ) {
      if (
        leg.instrumentProgram.equals(
          psyoptionsAmericanInstrumentProgram.address
        )
      ) {
        const amount = instrument.legInfo?.amount;
        const instrumentData =
          PsyoptionsAmericanInstrument.deserializeInstrumentData(
            Buffer.from(leg.instrumentData)
          );
        const metaKey = instrumentData.metaKey;
        const optionMarket = await psyoptionsAmerican.getOptionByKey(
          americanProgram,
          metaKey
        );
        const optionToken = await getOrCreateATA(
          convergence,
          optionMarket!.optionMint,
          caller
        );
        const writerToken = await getOrCreateATA(
          convergence,
          optionMarket!.writerTokenMint,
          caller
        );
        const underlyingToken = await getOrCreateATA(
          convergence,
          optionMarket!.underlyingAssetMint,
          caller
        );

        const ixWithSigners =
          await psyoptionsAmerican.instructions.mintOptionV2Instruction(
            americanProgram,
            optionToken,
            writerToken,
            underlyingToken,
            new anchor.BN(amount!),
            optionMarket as OptionMarketWithKey
          );

        const { ix } = ixWithSigners;
        instructions.push(ix);
      } else if (
        leg.instrumentProgram.equals(
          psyoptionsEuropeanInstrumentProgram.address
        )
      ) {
        const amount = instrument.legInfo?.amount;
        const instrumentData =
          PsyoptionsEuropeanInstrument.deserializeInstrumentData(
            Buffer.from(leg.instrumentData)
          );
        const euroMetaKey = instrumentData.metaKey;
        const euroMeta = await PsyoptionsEuropeanInstrument.fetchMeta(
          convergence,
          euroMetaKey
        );
        // euroMeta.underlyingAmountPerContract = new BN(
        //   euroMeta.underlyingAmountPerContract
        // );
        const optionType = instrumentData.optionType;
        const stableMint = euroMeta.stableMint;
        const underlyingMint = euroMeta.underlyingMint;
        const stableMintToken = convergence
          .tokens()
          .pdas()
          .associatedTokenAccount({
            mint: stableMint,
            owner: caller,
          });
        const underlyingMintToken = convergence
          .tokens()
          .pdas()
          .associatedTokenAccount({
            mint: underlyingMint,
            owner: caller,
          });
        const minterCollateralKey =
          optionType == OptionType.PUT ? stableMintToken : underlyingMintToken;

        const optionDestination = await getOrCreateATA(
          convergence,
          optionType == OptionType.PUT
            ? euroMeta.putOptionMint
            : euroMeta.callOptionMint,
          caller
        );
        const writerDestination = await getOrCreateATA(
          convergence,
          optionType == OptionType.PUT
            ? euroMeta.putWriterMint
            : euroMeta.callWriterMint,
          caller
        );
        //@ts-ignore
        const backupReceiver = await getOrCreateATA(
          convergence,
          optionType == OptionType.PUT
            ? euroMeta.putOptionMint
            : euroMeta.callOptionMint,
          caller
        );

        const { instruction: ix } = mintOptions(
          europeanProgram,
          euroMetaKey,
          //@ts-ignore
          euroMeta,
          minterCollateralKey,
          optionDestination,
          writerDestination,
          new anchor.BN(amount!),
          optionType
        );

        ix.keys[0] = {
          pubkey: caller,
          isSigner: true,
          isWritable: false,
        };

        instructions.push(ix);
      }
    }
  }

  const tx = new anchor.web3.Transaction();
  tx.instructions.push(...instructions);

  const recentBlockhash = await convergence.connection.getRecentBlockhash();
  tx.recentBlockhash = recentBlockhash.blockhash;

  return tx;
};

export const createAccountsAndMintOptions = async (
  convergence: Convergence,
  responseAddress: PublicKey,
  caller: Keypair,
  americanProgram?: any,
  europeanProgram?: any
) => {
  const response = await convergence
    .rfqs()
    .findResponseByAddress({ address: responseAddress });
  const rfq = await convergence
    .rfqs()
    .findRfqByAddress({ address: response.rfq });
  const confirmedSide = response.confirmed?.side;

  const callerIsTaker = caller.publicKey.toBase58() === rfq.taker.toBase58();
  const callerIsMaker =
    caller.publicKey.toBase58() === response.maker.toBase58();

  const txBuilder = TransactionBuilder.make().setFeePayer(
    convergence.rpc().getDefaultFeePayer()
  );

  for (const leg of rfq.legs) {
    const instrument = await legToInstrument(convergence, leg);
    if (
      (instrument.legInfo?.side === confirmedSide && callerIsTaker) ||
      (instrument.legInfo?.side !== confirmedSide && callerIsMaker)
    ) {
      if (
        leg.instrumentProgram.equals(
          psyoptionsAmericanInstrumentProgram.address
        ) &&
        americanProgram
      ) {
        const amount = instrument.legInfo?.amount;
        const instrumentData =
          PsyoptionsAmericanInstrument.deserializeInstrumentData(
            Buffer.from(leg.instrumentData)
          );
        const metaKey = instrumentData.metaKey;
        const optionMarket = await psyoptionsAmerican.getOptionByKey(
          americanProgram,
          metaKey
        );
        const optionToken = await getOrCreateATA(
          convergence,
          optionMarket!.optionMint,
          caller.publicKey
        );
        const writerToken = await getOrCreateATA(
          convergence,
          optionMarket!.writerTokenMint,
          caller.publicKey
        );
        const underlyingToken = await getOrCreateATA(
          convergence,
          optionMarket!.underlyingAssetMint,
          caller.publicKey
        );

        const ixWithSigners =
          await psyoptionsAmerican.instructions.mintOptionV2Instruction(
            americanProgram,
            optionToken,
            writerToken,
            underlyingToken,
            new anchor.BN(amount!),
            optionMarket as OptionMarketWithKey
          );
        ixWithSigners.signers.push(caller);
        ixWithSigners.ix.keys[0] = {
          pubkey: caller.publicKey,
          isSigner: true,
          isWritable: false,
        };

        const { ix } = ixWithSigners;
        txBuilder.add({ instruction: ix, signers: ixWithSigners.signers });
      } else if (
        leg.instrumentProgram.equals(
          psyoptionsEuropeanInstrumentProgram.address
        ) &&
        europeanProgram
      ) {
        const amount = instrument.legInfo?.amount;
        const instrumentData =
          PsyoptionsEuropeanInstrument.deserializeInstrumentData(
            Buffer.from(leg.instrumentData)
          );
        const euroMetaKey = instrumentData.metaKey;
        const euroMeta = await PsyoptionsEuropeanInstrument.fetchMeta(
          convergence,
          euroMetaKey
        );
        // euroMeta.underlyingAmountPerContract = new BN(
        //   euroMeta.underlyingAmountPerContract
        // );
        const optionType = instrumentData.optionType;
        const stableMint = euroMeta.stableMint;
        const underlyingMint = euroMeta.underlyingMint;
        const stableMintToken = convergence
          .tokens()
          .pdas()
          .associatedTokenAccount({
            mint: stableMint,
            owner: caller.publicKey,
          });
        const underlyingMintToken = convergence
          .tokens()
          .pdas()
          .associatedTokenAccount({
            mint: underlyingMint,
            owner: caller.publicKey,
          });
        const minterCollateralKey =
          optionType == OptionType.PUT ? stableMintToken : underlyingMintToken;

        const optionDestination = await getOrCreateATA(
          convergence,
          optionType == OptionType.PUT
            ? euroMeta.putOptionMint
            : euroMeta.callOptionMint,
          caller.publicKey
        );
        const writerDestination = await getOrCreateATA(
          convergence,
          optionType == OptionType.PUT
            ? euroMeta.putWriterMint
            : euroMeta.callWriterMint,
          caller.publicKey
        );
        //@ts-ignore
        const backupReceiver = await getOrCreateATA(
          convergence,
          optionType == OptionType.PUT
            ? euroMeta.putOptionMint
            : euroMeta.callOptionMint,
          caller.publicKey
        );

        const { instruction: ix } = mintOptions(
          europeanProgram,
          euroMetaKey,
          //@ts-ignore
          euroMeta,
          minterCollateralKey,
          optionDestination,
          writerDestination,
          new anchor.BN(amount!),
          optionType
        );

        ix.keys[0] = {
          pubkey: caller.publicKey,
          isSigner: true,
          isWritable: false,
        };

        txBuilder.add({ instruction: ix, signers: [caller] });
      }
    }
  }

  if (txBuilder.getInstructionCount() > 0) {
    const confirmOptions = makeConfirmOptionsFinalizedOnMainnet(convergence);
    await txBuilder.sendAndConfirm(convergence, confirmOptions);
  }
};

export const sortByActiveAndExpiry = (rfqs: Rfq[]) => {
  return rfqs
  .sort((a, b) => {
    return b.state === StoredRfqState.Active ? 1 : -1;
  })
  .sort((a, b) => {
    if (a.state === b.state) {
      const aTimeToExpiry = Number(a.creationTimestamp) + a.activeWindow;
      const bTimeToExpiry = Number(b.creationTimestamp) + b.activeWindow;
      return aTimeToExpiry - bTimeToExpiry;
    } else {
      return 0;
    }
  });
}