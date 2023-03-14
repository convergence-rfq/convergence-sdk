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
    description: 'Collateral decimals',
    defaultValue: '6',
  },
  {
    flags: '--collateral-for-variable-size-rfq-creation <number>',
    description: 'Collateral for variable size RFQ creation',
    defaultValue: '1000000000',
  },
  {
    flags: '--collateral-for-fixed-quote-amount-rfq-creation <number>',
    description: 'Collateral for fixed quote amount RFQ creation',
    defaultValue: '2000000000',
  },
  {
    flags: '--safety-price-shift-factor <number>',
    description: 'Safety price shift factor',
    defaultValue: '0.01',
  },
  {
    flags: '--overall-safety-factor <number>',
    description: 'Overall safety factor',
    defaultValue: '0.1',
  },
];

export const initializeRiskEngineCmd = (c: Command) =>
  addCmd(
    c,
    'initialize-risk-engine',
    'Initializes risk engine',
    initializeRiskEngine,
    riskEngineOptions
  );

export const updateRiskEngineCmd = (c: Command) =>
  addCmd(
    c,
    'update-risk-engine',
    'Updates risk engine',
    updateRiskEngine,
    riskEngineOptions
  );

export const setRiskEngineInstrumentTypeCmd = (c: Command) =>
  addCmd(
    c,
    'set-risk-engine-instrument-type',
    'Sets risk engine instrument type',
    setRiskEngineInstrumentType,
    [
      {
        flags: '--type <string>',
        description: 'Instrument type',
      },
      {
        flags: '--program <string>',
        description: 'Instrument program',
      },
    ]
  );

export const setRiskEngineCategoriesInfoCmd = (c: Command) =>
  addCmd(
    c,
    'set-risk-engine-risk-categories-info',
    'Sets risk engine risk categories info',
    setRiskEngineCategoriesInfo,
    [
      {
        flags: '--category <string>',
        description: 'Category',
      },
      {
        flags: '--new-value <value>',
        description: 'New value',
      },
    ]
  );

export const getRiskEngineConfigCmd = (c: Command) =>
  addCmd(
    c,
    'get-risk-engine-config',
    'Get risk engine risk config',
    getRiskEngineConfig
  );
