import {
  SpotLegInstrument,
  PsyoptionsAmericanInstrument,
  PsyoptionsEuropeanInstrument,
} from '@convergence-rfq/sdk';

export type Instrument =
  | SpotLegInstrument
  | PsyoptionsAmericanInstrument
  | PsyoptionsEuropeanInstrument;
