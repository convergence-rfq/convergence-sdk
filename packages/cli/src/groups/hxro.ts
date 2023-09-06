import { Command } from 'commander';

import { PublicKey } from '@solana/web3.js';
import { addCmd } from '../helpers';
import { createCvg, Opts } from '../cvg';
import { logError, logHxroConfig, logResponse } from '../logger';

const initializeConfigCmd = (c: Command) =>
  addCmd(c, 'initialize-config', 'initializes hxro config', initializeConfig, [
    {
      flags: '--valid-mpg <string>',
      description: 'Valid Hxro market product group',
    },
  ]);

export const initializeConfig = async (opts: Opts) => {
  const cvg = await createCvg(opts);
  try {
    const response = await cvg
      .hxro()
      .initializeConfig({ validMpg: new PublicKey(opts.validMpg) });
    logResponse(response);
  } catch (e) {
    logError(e);
  }
};

const modifyConfigCmd = (c: Command) =>
  addCmd(c, 'modify-config', 'modifiess hxro config', modifyConfig, [
    {
      flags: '--valid-mpg <string>',
      description: 'Valid Hxro market product group',
    },
  ]);

export const modifyConfig = async (opts: Opts) => {
  const cvg = await createCvg(opts);
  try {
    const response = await cvg
      .hxro()
      .modifyConfig({ validMpg: new PublicKey(opts.validMpg) });
    logResponse(response);
  } catch (e) {
    logError(e);
  }
};

const displayConfigCmd = (c: Command) =>
  addCmd(c, 'display-config', 'displays hxro config', displayConfig, []);

export const displayConfig = async (opts: Opts) => {
  const cvg = await createCvg(opts);
  try {
    const config = await cvg.hxro().fetchConfig();
    logHxroConfig(config);
  } catch (e) {
    logError(e);
  }
};

export const hxroGroup = (c: Command) => {
  const group = c.command('hxro');
  initializeConfigCmd(group);
  modifyConfigCmd(group);
  displayConfigCmd(group);
};
