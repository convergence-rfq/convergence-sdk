export type InstrumentType = 'spot' | 'option' | 'term-future' | 'perp-future';

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
