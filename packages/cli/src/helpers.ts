import {
  Side,
  SpotLegInstrument,
  PsyoptionsAmericanInstrument,
  PsyoptionsEuropeanInstrument,
  LegInstrument,
} from '@convergence-rfq/sdk';
import { Command } from 'commander';

import { Instrument } from './types';
import { DEFAULT_KEYPAIR_FILE, DEFAULT_RPC_ENDPOINT } from './constants';

export const getSide = (side: string): Side => {
  switch (side) {
    case 'bid':
      return Side.Bid;
    case 'ask':
      return Side.Ask;
    default:
      throw new Error('Invalid side');
  }
};

export function assertInstrument(
  instrument: LegInstrument
): asserts instrument is Instrument {
  if (
    !(instrument instanceof SpotLegInstrument) ||
    !(instrument instanceof PsyoptionsAmericanInstrument) ||
    !(instrument instanceof PsyoptionsEuropeanInstrument)
  ) {
    throw new Error('Invalid instrument');
  }
}

export const formatInstrument = (instrument: Instrument): string => {
  if (instrument instanceof SpotLegInstrument) {
    return 'spot';
  } else if (instrument instanceof PsyoptionsAmericanInstrument) {
    return 'psyoptions american option';
  } else if (instrument instanceof PsyoptionsEuropeanInstrument) {
    return 'psyoptions european option';
  }

  throw new Error('Invalid instrument');
};

export const formatSide = (side: Side): string => {
  switch (side) {
    case Side.Bid:
      return 'bid';
    case Side.Ask:
      return 'ask';
    default:
      throw new Error('Invalid side');
  }
};

export const addDefaultArgs = (cmd: any) => {
  cmd.option('--rpc-endpoint <string>', 'RPC endpoint', DEFAULT_RPC_ENDPOINT);
  cmd.option('--keypair-file <string>', 'keypair file', DEFAULT_KEYPAIR_FILE);
  cmd.option('--verbose <boolean>', 'verbose', false);
  return cmd;
};
export const addCmd = (
  c: Command,
  name: string,
  description: string,
  action: (...args: any[]) => any,
  options?: Array<{
    flags: string;
    description: string;
    defaultValue?: any;
  }>
) => {
  const cmd = c.command(name).description(description).action(action);

  if (options) {
    for (const { flags, description, defaultValue } of options) {
      // NOTE: There is a hack in the code to make this work because default value can be false or null
      if (defaultValue !== undefined) {
        if (defaultValue === null) {
          cmd.option(flags, description);
        } else {
          cmd.option(flags, description, defaultValue);
        }
      } else {
        cmd.requiredOption(flags, description);
      }
    }
  }

  addDefaultArgs(cmd);

  return cmd;
};
