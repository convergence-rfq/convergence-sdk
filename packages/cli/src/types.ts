import {
  SpotInstrument,
  PsyoptionsAmericanInstrument,
  PsyoptionsEuropeanInstrument,
} from '@convergence-rfq/sdk';

export type Instrument =
  | SpotInstrument
  | PsyoptionsAmericanInstrument
  | PsyoptionsEuropeanInstrument;
