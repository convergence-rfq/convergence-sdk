import { AccountMeta } from '@solana/web3.js';
import { Sha256 } from '@aws-crypto/sha256-js';
import { Leg } from '@convergence-rfq/rfq';
import {
  Confirmation,
  Quote,
  isFixedSizeBaseAsset,
  isFixedSizeQuoteAsset,
  isQuoteStandard,
} from '../rfqModule/models';
import { UnparsedAccount } from '../../types';
import { Convergence } from '../../Convergence';
import {
  LegInstrument,
  getSerializedLegLength,
  getValidationAccounts,
  serializeAsLeg,
  toLeg,
} from '../instrumentModule';
import { Rfq, Response, isFixedSizeOpen } from './models';
import { LEG_MULTIPLIER_DECIMALS } from './constants';

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

export function extractLegsMultiplier(
  rfq: Rfq,
  quote: Quote,
  confirmation?: Confirmation
) {
  const fixedSize = rfq.size;
  if (confirmation?.overrideLegMultiplier) {
    return confirmation.overrideLegMultiplier;
  }
  if (isFixedSizeOpen(fixedSize)) {
    if (isQuoteStandard(quote)) {
      return quote.legsMultiplier;
    }
    throw Error('Fixed size quote cannot be provided to non-fixed size rfq');
  } else if (isFixedSizeBaseAsset(fixedSize)) {
    if (isQuoteStandard(quote)) {
      throw Error('Non fixed size quote cannot be provided to fixed size rfq');
    }
    return fixedSize.amount;
  } else if (isFixedSizeQuoteAsset(fixedSize)) {
    if (isQuoteStandard(quote)) {
      throw Error('Non fixed size quote cannot be provided to fixed size rfq');
    }

    if (quote.price < 0) {
      throw Error('Negative prices are not allowed for fixed quote amount rfq');
    }
    const amount = fixedSize.amount / quote.price;
    const legsMultiplier = Number(amount.toFixed(LEG_MULTIPLIER_DECIMALS));
    return legsMultiplier;
  }
  throw new Error('Invalid fixed size');
}
