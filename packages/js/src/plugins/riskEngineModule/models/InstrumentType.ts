import {
  StoredInstrumentType as SolitaStoredInstrumentType,
  InstrumentType as SolitaInstrumentType,
} from '@convergence-rfq/risk-engine';

export type InstrumentType = 'spot' | 'option' | 'term-future' | 'perp-future';

export function fromSolitaInstrumentType(
  instrumentType: SolitaStoredInstrumentType
): InstrumentType | null {
  switch (instrumentType) {
    case SolitaStoredInstrumentType.Missing: {
      return null;
    }
    case SolitaStoredInstrumentType.Spot: {
      return 'spot';
    }
    case SolitaStoredInstrumentType.Option: {
      return 'option';
    }
    case SolitaStoredInstrumentType.PerpFuture: {
      return 'perp-future';
    }
    case SolitaStoredInstrumentType.TermFuture: {
      return 'term-future';
    }
  }
}

export function toSolitaInstrumentType(
  instrumentType: InstrumentType
): SolitaInstrumentType {
  switch (instrumentType) {
    case 'spot': {
      return SolitaInstrumentType.Spot;
    }
    case 'option': {
      return SolitaInstrumentType.Option;
    }
    case 'perp-future': {
      return SolitaInstrumentType.PerpFuture;
    }
    case 'term-future': {
      return SolitaInstrumentType.TermFuture;
    }
  }
}
