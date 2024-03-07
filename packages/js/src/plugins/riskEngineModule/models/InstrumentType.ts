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

export function toNumberInstrumentType(instrumentType: InstrumentType): number {
  switch (instrumentType) {
    case 'spot': {
      return 1;
    }
    case 'option': {
      return 2;
    }
    case 'term-future': {
      return 3;
    }
    case 'perp-future': {
      return 4;
    }
  }
}

export function fromNumberInstrumentType(
  instrumentType: number
): InstrumentType {
  switch (instrumentType) {
    case 1: {
      return 'spot';
    }
    case 2: {
      return 'option';
    }
    case 3: {
      return 'term-future';
    }
    case 4: {
      return 'perp-future';
    }
    default:
      throw new Error('Invalid instrument type!');
  }
}
