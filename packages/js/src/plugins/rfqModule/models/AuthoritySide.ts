import { AuthoritySide as SolitaAuthoritySide } from "@convergence-rfq/rfq";

const Taker = 'taker' as const;
const Maker = 'maker' as const;

export type AuthoritySide = typeof Taker | typeof Maker;

export function fromSolitaAuthoritySide(authoritySide: SolitaAuthoritySide): AuthoritySide {
  switch(authoritySide) {
    case SolitaAuthoritySide.Maker: {
      return Maker;
    }
    case SolitaAuthoritySide.Taker: {
      return Taker;
    }
  }
}

export function toSolitaAuthoritySide(authoritySide: AuthoritySide): SolitaAuthoritySide {
  switch(authoritySide) {
    case Maker: {
      return SolitaAuthoritySide.Maker;
    }
    case Taker: {
      return SolitaAuthoritySide.Taker;
    }
  }
}
