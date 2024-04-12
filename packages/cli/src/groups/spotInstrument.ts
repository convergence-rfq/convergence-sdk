/* eslint-disable no-console */

import { Command } from 'commander';

import { addCmd, expirationRetry } from '../helpers';
import { createCvg, Opts } from '../cvg';
import { logError, logResponse, logSpotInstrumentConfig } from '../logger';

const initializeConfigCmd = (c: Command) =>
  addCmd(
    c,
    'initialize-config',
    'initializes spot instrument config',
    initializeConfig,
    [
      {
        flags: '--fee-bps <number>',
        description: 'Quote fees, value of 0.01 means 1%',
      },
    ]
  );

const initializeConfig = async (opts: Opts) => {
  const cvg = await createCvg(opts);
  try {
    const response = await expirationRetry(
      () => cvg.spotInstrument().initializeConfig({ feeBps: opts.feeBps }),
      opts
    );
    logResponse(response);
  } catch (e) {
    logError(e);
  }
};

const modifyConfigCmd = (c: Command) =>
  addCmd(c, 'modify-config', 'modifiess spot instrument config', modifyConfig, [
    {
      flags: '--fee-bps <number>',
      description: 'Quote fees, value of 0.01 means 1%',
    },
  ]);

const modifyConfig = async (opts: Opts) => {
  const cvg = await createCvg(opts);
  try {
    const response = await cvg
      .spotInstrument()
      .modifyConfig({ feeBps: opts.feeBps });
    logResponse(response);
  } catch (e) {
    logError(e);
  }
};

const displayConfigCmd = (c: Command) =>
  addCmd(
    c,
    'display-config',
    'displays spot instrument config',
    displayConfig,
    []
  );

const displayConfig = async (opts: Opts) => {
  const cvg = await createCvg(opts);
  try {
    const config = await cvg.spotInstrument().fetchConfig();
    logSpotInstrumentConfig(config);
  } catch (e) {
    logError(e);
  }
};

export const spotInstrumentGroup = (c: Command) => {
  const group = c.command('spot-instrument');
  initializeConfigCmd(group);
  modifyConfigCmd(group);
  displayConfigCmd(group);
};
