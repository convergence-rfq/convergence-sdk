import { Instrument } from '@convergence-rfq/rfq';

export type HumanInstrument = {
  readonly model: 'humanInstrument';
  readonly program: string;
  readonly enabled: boolean;
  readonly canBeUsedAsQuote: boolean;
  readonly validateDataAccountAmount: number;
  readonly prepareToSettleAccountAmount: number;
  readonly settleAccountAmount: number;
  readonly revertPreparationAccountAmount: number;
  readonly cleanUpAccountAmount: number;
};

export const toHumanInstrument = (instrument: Instrument): HumanInstrument => {
  return {
    model: 'humanInstrument',
    program: instrument.programKey.toBase58(),
    enabled: instrument.enabled,
    canBeUsedAsQuote: instrument.canBeUsedAsQuote,
    validateDataAccountAmount: instrument.validateDataAccountAmount,
    prepareToSettleAccountAmount: instrument.prepareToSettleAccountAmount,
    settleAccountAmount: instrument.settleAccountAmount,
    revertPreparationAccountAmount: instrument.revertPreparationAccountAmount,
    cleanUpAccountAmount: instrument.cleanUpAccountAmount,
  };
};
