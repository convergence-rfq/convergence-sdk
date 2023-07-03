import { Side as SolitaSide } from "@convergence-rfq/rfq";

const Bid = 'bid' as const;
const Ask = 'ask' as const;

export type ResponseSide = typeof Bid | typeof Ask;

export function fromSolitaSide(responseSide: SolitaSide): ResponseSide {
  switch(responseSide) {
    case SolitaSide.Ask: {
      return Ask;
    }
    case SolitaSide.Bid: {
      return Bid;
    }
  }
}

export function toSolitaSide(responseSide: ResponseSide): SolitaSide {
  switch(responseSide) {
    case Ask: {
      return SolitaSide.Ask;
    }
    case Bid: {
      return SolitaSide.Bid;
    }
  }
}
