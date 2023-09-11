import { AccountMeta, PublicKey } from '@solana/web3.js';
import { Sha256 } from '@aws-crypto/sha256-js';
import { Leg } from '@convergence-rfq/rfq';

import { UnparsedAccount } from '../../types';
import { Convergence } from '../../Convergence';
import {
  LegInstrument,
  getValidationAccounts,
  instrumentToSolitaLeg,
} from '../instrumentModule';
import { Rfq, Response, AuthoritySide } from './models';

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

export const calculateExpectedLegsHash = (
  serializedLegs: Buffer[]
): Uint8Array => {
  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeInt32LE(serializedLegs.length);
  const fullLegDataBuffer = Buffer.concat([lengthBuffer, ...serializedLegs]);

  const hash = new Sha256();
  hash.update(fullLegDataBuffer);
  const expectedLegsHash = hash.digestSync();

  return expectedLegsHash;
};

export const calculateExpectedLegsSize = (serializedLegs: Buffer[]): number => {
  return 4 + serializedLegs.map((leg) => leg.length).reduce((x, y) => x + y, 0);
};

export const instrumentsToLegs = (instruments: LegInstrument[]): Leg[] => {
  return instruments.map((i) => instrumentToSolitaLeg(i));
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

export const getAuthoritySide = (
  user: PublicKey,
  rfq: Rfq,
  response: Response
): AuthoritySide | null => {
  if (rfq.taker.equals(user)) {
    return 'taker';
  }

  if (response.maker.equals(user)) {
    return 'maker';
  }

  return null;
};
