import { Command } from 'commander';

import {
  initializeRiskEngine,
  getRiskEngineConfig,
  updateRiskEngine,
  setRiskEngineInstrumentType,
  setRiskEngineCategoriesInfo,
  closeRiskEngine,
} from '../actions';
import { addCmd } from '../helpers';

const riskEngineOptions = [
  {
    flags: '--collateral-mint-decimals <number>',
    description: 'collateral decimals',
    defaultValue: '6',
  },
  {
    flags: '--collateral-for-variable-size-rfq-creation <number>',
    description: 'collateral for variable size RFQ creation',
    defaultValue: '1000000000',
  },
  {
    flags: '--collateral-for-fixed-quote-amount-rfq-creation <number>',
    description: 'collateral for fixed quote amount RFQ creation',
    defaultValue: '2000000000',
  },
  {
    flags: '--safety-price-shift-factor <number>',
    description: 'safety price shift factor',
    defaultValue: '0.01',
  },
  {
    flags: '--overall-safety-factor <number>',
    description: 'overall safety factor',
    defaultValue: '0.1',
  },
  {
    flags: '--accepted-oracle-staleness <number>',
    description: 'accepted oracle staleness',
    defaultValue: '300',
  },
  {
    flags: '--accepted-oracle-confidence-interval-portion <number>',
    description: 'accepted oracle confidence interval portion',
    defaultValue: '0.1',
  },
];

const initializeRiskEngineCmd = (c: Command) =>
  addCmd(
    c,
    'initialize',
    'initializes risk engine',
    initializeRiskEngine,
    riskEngineOptions
  );

const closeRiskEngineCmd = (c: Command) =>
  addCmd(c, 'close', 'closes risk engine', closeRiskEngine);

const updateRiskEngineCmd = (c: Command) =>
  addCmd(
    c,
    'update',
    'updates risk engine',
    updateRiskEngine,
    riskEngineOptions
  );

const setRiskEngineInstrumentTypeCmd = (c: Command) =>
  addCmd(
    c,
    'set-instrument-type',
    'sets risk engine instrument type',
    setRiskEngineInstrumentType,
    [
      {
        flags: '--type <string>',
        description: 'instrument type',
      },
      {
        flags: '--program <string>',
        description: 'instrument program',
      },
    ]
  );

const setRiskEngineCategoriesInfoCmd = (c: Command) =>
  addCmd(
    c,
    'set-risk-categories-info',
    'sets risk engine risk categories info',
    setRiskEngineCategoriesInfo,
    [
      {
        flags: '--category <string>',
        description: 'category',
      },
      {
        flags: '--new-value <value>',
        description: 'new value',
      },
    ]
  );

const getRiskEngineConfigCmd = (c: Command) =>
  addCmd(c, 'get', 'gets risk engine config', getRiskEngineConfig);

export const riskEngineGroup = (c: Command) => {
  const group = c.command('risk-engine');
  initializeRiskEngineCmd(group);
  closeRiskEngineCmd(group);
  updateRiskEngineCmd(group);
  setRiskEngineInstrumentTypeCmd(group);
  setRiskEngineCategoriesInfoCmd(group);
  getRiskEngineConfigCmd(group);
};
