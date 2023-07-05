import { AuthoritySide as SolitaAuthoritySide } from "@convergence-rfq/rfq";

const Maker = 'maker' as const;
const Taker = 'taker' as const;

export type AuthoritySide = typeof Maker | typeof Taker;

export function fromSolitaAuthoritySide(AuthoritySide: SolitaAuthoritySide): AuthoritySide {
  switch(AuthoritySide) {
    case SolitaAuthoritySide.Maker: {
      return Maker;
    }
    case SolitaAuthoritySide.Taker: {
      return Taker;
    }
  }
}

export function toSolitaAuthoritySide(AuthoritySide: AuthoritySide): SolitaAuthoritySide {
  switch(AuthoritySide) {
    case Maker: {
      return SolitaAuthoritySide.Maker;
    }
    case Taker: {
      return SolitaAuthoritySide.Taker;
    }
  }
}
