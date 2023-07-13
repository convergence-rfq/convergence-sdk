import { QuoteSide as SolitaQuoteSide } from '@convergence-rfq/rfq';

const Bid = 'bid' as const;
const Ask = 'ask' as const;

export type ResponseSide = typeof Bid | typeof Ask;

export function fromSolitaQuoteSide(
  responseSide: SolitaQuoteSide
): ResponseSide {
  switch (responseSide) {
    case SolitaQuoteSide.Ask: {
      return Ask;
    }
    case SolitaQuoteSide.Bid: {
      return Bid;
    }
  }
}

export function toSolitaQuoteSide(responseSide: ResponseSide): SolitaQuoteSide {
  switch (responseSide) {
    case Ask: {
      return SolitaQuoteSide.Ask;
    }
    case Bid: {
      return SolitaQuoteSide.Bid;
    }
  }
}
