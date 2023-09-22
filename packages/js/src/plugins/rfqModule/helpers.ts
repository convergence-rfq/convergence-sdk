import { AccountMeta } from '@solana/web3.js';
import { Sha256 } from '@aws-crypto/sha256-js';
import {
  Confirmation,
  Quote,
  isFixedSizeBaseAsset,
  isFixedSizeQuoteAsset,
  isQuoteStandard,
} from '../rfqModule/models';
import { UnparsedAccount } from '../../types';
import {
  LegInstrument,
  getSerializedLegLength,
  serializeAsLeg,
} from '../instrumentModule';
import { PsyoptionsAmericanInstrument } from '../psyoptionsAmericanInstrumentModule';
import { PsyoptionsEuropeanInstrument } from '../psyoptionsEuropeanInstrumentModule';
import { LEG_MULTIPLIER_DECIMALS } from './constants';
import { Rfq, Response, isFixedSizeOpen } from './models';

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

export type GetRfqLegstoAddResult = {
  initialLegsToAdd: number;
  postLegsToAdd?: number;
};

export const isOptionLegInstrument = (instrument: LegInstrument): boolean => {
  return (
    instrument instanceof PsyoptionsAmericanInstrument ||
    instrument instanceof PsyoptionsEuropeanInstrument
  );
};

export const removeDuplicateAccountMeta = (
  accountMeta: AccountMeta[]
): AccountMeta[] => {
  const uniqueAccountMeta: AccountMeta[] = [];
  for (let i = 0; i < accountMeta.length; i++) {
    if (
      !uniqueAccountMeta.find((x) => x.pubkey.equals(accountMeta[i].pubkey))
    ) {
      uniqueAccountMeta.push(accountMeta[i]);
    }
  }
  return uniqueAccountMeta;
};
