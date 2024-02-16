import {
  SpotLegInstrument,
  PsyoptionsAmericanInstrument,
  PsyoptionsEuropeanInstrument,
  LegInstrument,
  FixedSize,
  InstrumentType,
} from '@convergence-rfq/sdk';
import { Command } from 'commander';

import { Connection } from '@solana/web3.js';
import { Instrument } from './types';
import { DEFAULT_KEYPAIR_FILE, DEFAULT_RPC_ENDPOINT } from './constants';

export const getInstrumentType = (type: string): InstrumentType => {
  switch (type) {
    case 'spot':
      return InstrumentType.Spot;
    case 'option':
      return InstrumentType.Option;
    default:
      throw new Error('Invalid instrument type');
  }
};

export const getSize = (size: string, amount: number): FixedSize => {
  switch (size) {
    case 'fixed-base':
      return { type: 'fixed-base', amount };
    case 'fixed-quote':
      return { type: 'fixed-quote', amount };
    case 'open':
      return { type: 'open' };
    default:
      throw new Error('Invalid size');
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

export const getSigConfirmation = async (
  connection: Connection,
  tx: string
) => {
  const result = await connection.getSignatureStatus(tx, {
    searchTransactionHistory: true,
  });
  return result?.value?.confirmationStatus;
};
