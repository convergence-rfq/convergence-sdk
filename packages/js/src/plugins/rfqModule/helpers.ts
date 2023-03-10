import { PublicKey, AccountMeta, Keypair } from '@solana/web3.js';
import { Sha256 } from '@aws-crypto/sha256-js';
import { PROGRAM_ID as SPOT_INSTRUMENT_PROGRAM_ID } from '@convergence-rfq/spot-instrument';
import { PROGRAM_ID as PSYOPTIONS_EUROPEAN_INSTRUMENT_PROGRAM_ID } from '@convergence-rfq/psyoptions-european-instrument';
import { Quote, Leg, FixedSize, QuoteAsset } from '@convergence-rfq/rfq';
import { OptionMarketWithKey } from '@mithraic-labs/psy-american';
import * as anchor from '@project-serum/anchor';
import * as psyoptionsAmerican from '@mithraic-labs/psy-american';

import {
  instructions,
  EuroPrimitive,
  createProgram,
  programId as psyoptionsEuropeanProgramId,
} from '@mithraic-labs/tokenized-euros';
import { spotInstrumentProgram, SpotInstrument } from '../spotInstrumentModule';
import {
  PsyoptionsEuropeanInstrument,
  psyoptionsEuropeanInstrumentProgram,
} from '../psyoptionsEuropeanInstrumentModule';
import { PsyoptionsAmericanInstrument } from '../psyoptionsAmericanInstrumentModule/models/PsyoptionsAmericanInstrument';
import { psyoptionsAmericanInstrumentProgram } from '../psyoptionsAmericanInstrumentModule/programs';
import { Mint } from '../tokenModule';
import type { Rfq, Response } from './models';
//@ts-ignore
import { LEG_MULTIPLIER_DECIMALS, QUOTE_AMOUNT_DECIMALS } from './constants';
import { CvgWallet } from '@/utils/CvgWallet';
import { Convergence } from '@/Convergence';
import {
  UnparsedAccount,
  PublicKeyValues,
  token,
  toPublicKey,
  toBigNumber,
  Pda,
  makeConfirmOptionsFinalizedOnMainnet,
} from '@/types';
const { initializeAllAccountsInstructions, createEuroMetaInstruction } =
  instructions;
import { TransactionBuilder } from '@/utils';

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
  mintDecimlas: number
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
    amount: token(1_000_000, mintDecimlas),
    toToken: TokenWallet.address,
    mintAuthority,
  });
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

export const convertFixedSizeInput = (
  fixedSize: FixedSize,
  quoteAsset: QuoteAsset
): FixedSize => {
  if (fixedSize.__kind == 'BaseAsset') {
    const parsedLegsMultiplierBps =
      Number(fixedSize.legsMultiplierBps) *
      Math.pow(10, LEG_MULTIPLIER_DECIMALS);

    fixedSize.legsMultiplierBps = parsedLegsMultiplierBps;
  } else if (fixedSize.__kind == 'QuoteAsset') {
    const parsedQuoteAmount =
      Number(fixedSize.quoteAmount) *
      Math.pow(10, quoteAsset.instrumentDecimals);

    fixedSize.quoteAmount = parsedQuoteAmount;
  }

  return fixedSize;
};

export const convertRfqOutput = async (
  rfq: Rfq,
  collateralMintDecimals: number
): Promise<Rfq> => {
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
  if (response.bid) {
    const parsedPriceQuoteAmountBps =
      Number(response.bid.priceQuote.amountBps) / Math.pow(10, quoteDecimals);

    response.bid.priceQuote.amountBps = parsedPriceQuoteAmountBps;

    if (response.bid.__kind == 'Standard') {
      const parsedLegsMultiplierBps =
        Number(response.bid.legsMultiplierBps) /
        Math.pow(10, LEG_MULTIPLIER_DECIMALS);

      response.bid.legsMultiplierBps = parsedLegsMultiplierBps;
    }
  }
  if (response.ask) {
    const parsedPriceQuoteAmountBps =
      Number(response.ask.priceQuote.amountBps) / Math.pow(10, quoteDecimals);

    response.ask.priceQuote.amountBps = parsedPriceQuoteAmountBps;

    if (response.ask.__kind == 'Standard') {
      const parsedLegsMultiplierBps =
        Number(response.ask.legsMultiplierBps) /
        Math.pow(10, LEG_MULTIPLIER_DECIMALS);

      response.ask.legsMultiplierBps = parsedLegsMultiplierBps;
    }
  }

  return response;
};

export const convertResponseInput = (
  quoteDecimals: number,
  bid?: Quote,
  ask?: Quote
) => {
  if (bid) {
    const parsedPriceQuoteAmountBps =
      Number(bid.priceQuote.amountBps) * Math.pow(10, quoteDecimals);

    bid.priceQuote.amountBps = parsedPriceQuoteAmountBps;

    if (bid.__kind == 'Standard') {
      const parsedLegsMultiplierBps =
        Number(bid.legsMultiplierBps) * Math.pow(10, LEG_MULTIPLIER_DECIMALS);

      bid.legsMultiplierBps = parsedLegsMultiplierBps;
    }
  }
  if (ask) {
    const parsedPriceQuoteAmountBps =
      Number(ask.priceQuote.amountBps) * Math.pow(10, quoteDecimals);

    ask.priceQuote.amountBps = parsedPriceQuoteAmountBps;

    if (ask.__kind == 'Standard') {
      const parsedLegsMultiplierBps =
        Number(ask.legsMultiplierBps) * Math.pow(10, LEG_MULTIPLIER_DECIMALS);

      ask.legsMultiplierBps = parsedLegsMultiplierBps;
    }
  }

  return { bid, ask };
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
    // legsSize += await instrumentClient.getLegDataSize();
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
  oracleProviderId = 0
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
