import {
  PublicKey,
  AccountMeta,
  Keypair,
  TransactionInstruction,
} from '@solana/web3.js';
import * as Spl from '@solana/spl-token';
import { Sha256 } from '@aws-crypto/sha256-js';
import { Leg} from '@convergence-rfq/rfq';

import {
  UnparsedAccount,
  PublicKeyValues,
  token,
  toPublicKey,
  Program,
} from '../../types';
import { Convergence } from '../../Convergence';
import { PsyoptionsEuropeanInstrument } from '../psyoptionsEuropeanInstrumentModule';
import { PsyoptionsAmericanInstrument } from '../psyoptionsAmericanInstrumentModule';
import { collateralMintCache } from '../collateralModule';
import {
  LegInstrument,
  getSerializedLegLength,
  getValidationAccounts,
  serializeAsLeg,
  toLeg,
} from '../instrumentModule';
import { SpotLegInstrument } from '../spotInstrumentModule';
import { Rfq, Response } from './models';

export type HasMintAddress = Rfq | PublicKey;

export const toMintAddress = (
  value: PublicKeyValues | HasMintAddress
): PublicKey => {
  return toPublicKey(value);
};

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

  const collateralMint = await collateralMintCache.get(cvg);

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

export const getOrCreateATAInx = async (
  convergence: Convergence,
  mint: PublicKey,
  owner: PublicKey,
  programs?: Program[]
): Promise<TransactionInstruction | PublicKey> => {
  const pda = convergence.tokens().pdas().associatedTokenAccount({
    mint,
    owner,
    programs,
  });
  const account = await convergence.rpc().getAccount(pda);
  let ix: TransactionInstruction;
  if (!account.exists) {
    ix = Spl.createAssociatedTokenAccountInstruction(
      owner,
      pda,
      owner,
      mint,
      Spl.TOKEN_PROGRAM_ID,
      Spl.ASSOCIATED_TOKEN_PROGRAM_ID
    );
    return ix;
  }
  return pda;
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

export const calculateExpectedLegsHash = (
  instruments: LegInstrument[]
): Uint8Array => {
  const serializedLegsData: Buffer[] = instruments.map((i) =>
    serializeAsLeg(i)
  );

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

export const calculateExpectedLegsSize = (
  instruments: LegInstrument[]
): number => {
  return (
    4 +
    instruments.map((i) => getSerializedLegLength(i)).reduce((x, y) => x + y, 0)
  );
};

// TODO remove
export const instrumentsToLegsAndLegsSize = (
  instruments: LegInstrument[]
): [Leg[], number] => {
  return [
    instrumentsToLegs(instruments),
    calculateExpectedLegsSize(instruments),
  ];
};

export const instrumentsToLegs = (instruments: LegInstrument[]): Leg[] => {
  return instruments.map((i) => toLeg(i));
};

// TODO remove
export const instrumentsToLegsAndExpectedLegsHash = (
  instruments: LegInstrument[]
): [Leg[], Uint8Array] => {
  return [
    instrumentsToLegs(instruments),
    calculateExpectedLegsHash(instruments),
  ];
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
      .baseAsset({ index: leg.baseAssetIndex.value });

    const baseAssetAccount: AccountMeta = {
      pubkey: baseAsset,
      isSigner: false,
      isWritable: false,
    };

    baseAssetAccounts.push(baseAssetAccount);
  }

  return baseAssetAccounts;
};

// TODO remove async part after option instruments refactoring
export const instrumentsToLegAccounts = async (
  instruments: LegInstrument[]
): Promise<AccountMeta[]> => {
  const accounts = await Promise.all(
    instruments.map((i) => getValidationAccounts(i))
  );

  return accounts.flat();
};

export const sortByActiveAndExpiry = (rfqs: Rfq[]) => {
  return rfqs
    .sort((a, b) => {
      return b.state === 'active' ? 1 : -1;
    })
    .sort((a, b) => {
      if (a.state === b.state) {
        const aTimeToExpiry = Number(a.creationTimestamp) + a.activeWindow;
        const bTimeToExpiry = Number(b.creationTimestamp) + b.activeWindow;
        return aTimeToExpiry - bTimeToExpiry;
      }
      return 0;
    });
};

export const legToBaseAssetMint = async (
  convergence: Convergence,
  leg: LegInstrument
) => {
  if (leg instanceof PsyoptionsEuropeanInstrument) {
    const euroMetaOptionMint = await convergence.tokens().findMintByAddress({
      address: leg.optionMint,
    });

    return euroMetaOptionMint;
  } else if (leg instanceof PsyoptionsAmericanInstrument) {
    const americanOptionMint = await convergence.tokens().findMintByAddress({
      address: leg.optionMint,
    });

    return americanOptionMint;
  } else if (leg instanceof SpotLegInstrument) {
    const mint = await convergence.tokens().findMintByAddress({
      address: leg.mintAddress,
    });

    return mint;
  }

  throw Error('Unsupported instrument!');
};
