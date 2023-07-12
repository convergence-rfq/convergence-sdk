import { LegSide as SolitaLegSide } from '@convergence-rfq/rfq';

const Long = 'long' as const;
const Short = 'short' as const;

export type LegSide = typeof Long | typeof Short;

export function fromSolitaLegSide(responseSide: SolitaLegSide): LegSide {
  switch (responseSide) {
    case SolitaLegSide.Short: {
      return Short;
    }
    case SolitaLegSide.Long: {
      return Long;
    }
  }
}

export function toSolitaLegSide(legSide: LegSide): SolitaLegSide {
  switch (legSide) {
    case Short: {
      return SolitaLegSide.Short;
    }
    case Long: {
      return SolitaLegSide.Long;
    }
  }
}
