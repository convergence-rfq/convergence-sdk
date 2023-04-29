export { AggregatorRound } from './aggregatorRound';
export type { AggregatorRoundFields } from './aggregatorRound';
export { SwitchboardDecimal } from './switchboardDecimal';
export type { SwitchboardDecimalFields } from './switchboardDecimal';
export { Hash } from './hash';
export type { HashFields } from './hash';
import * as AggregatorResolutionMode from './aggregatorResolutionModeKind';

export type AggregatorResolutionModeKind =
  | AggregatorResolutionMode.ModeRoundResolution
  | AggregatorResolutionMode.ModeSlidingResolution;
export { AggregatorResolutionMode };
