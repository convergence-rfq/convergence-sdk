import {
  Confirmation,
  Quote,
  isFixedSizeBaseAsset,
  isFixedSizeQuoteAsset,
  isQuoteStandard,
} from '../rfqModule/models';
import { UnparsedAccount } from '../../types';
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

export function extractLegAmount(
  rfq: Rfq,
  quote: Quote,
  confirmation?: Confirmation
) {
  const fixedSize = rfq.size;
  if (confirmation?.overrideLegAmount) {
    return confirmation.overrideLegAmount;
  }
  if (isFixedSizeOpen(fixedSize)) {
    if (isQuoteStandard(quote)) {
      return quote.legAmount;
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
    const legAmount = Number(amount.toFixed(rfq.legAssetDecimals));
    return legAmount;
  }
  throw new Error('Invalid fixed size');
}
