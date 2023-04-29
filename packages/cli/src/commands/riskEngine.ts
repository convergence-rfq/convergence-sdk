import { Command } from 'commander';
import {
  initializeRiskEngine,
  getRiskEngineConfig,
  updateRiskEngine,
  setRiskEngineInstrumentType,
  setRiskEngineCategoriesInfo,
} from '../actions';

import { addCmd } from './helpers';

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

export const initializeRiskEngineCmd = (c: Command) =>
  addCmd(
    c,
    'risk-engine:initialize',
    'initializes risk engine',
    initializeRiskEngine,
    riskEngineOptions
  );

export const updateRiskEngineCmd = (c: Command) =>
  addCmd(
    c,
    'risk-engine:update',
    'updates risk engine',
    updateRiskEngine,
    riskEngineOptions
  );

export const setRiskEngineInstrumentTypeCmd = (c: Command) =>
  addCmd(
    c,
    'risk-engine:set-instrument-type',
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

export const setRiskEngineCategoriesInfoCmd = (c: Command) =>
  addCmd(
    c,
    'risk-engine:set-risk-categories-info',
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

export const getRiskEngineConfigCmd = (c: Command) =>
  addCmd(
    c,
    'risk-engine:get-config',
    'gets risk engine config',
    getRiskEngineConfig
  );
