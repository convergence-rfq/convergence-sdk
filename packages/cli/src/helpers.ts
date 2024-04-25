import {
  SpotLegInstrument,
  PsyoptionsAmericanInstrument,
  PsyoptionsEuropeanInstrument,
  LegInstrument,
  FixedSize,
  TransactionPriority,
} from '@convergence-rfq/sdk';
import { Command } from 'commander';

import { Connection } from '@solana/web3.js';
import { CoinGeckoResponse, Instrument } from './types';
import { DEFAULT_KEYPAIR_FILE, DEFAULT_RPC_ENDPOINT } from './constants';
import { Opts } from './cvg';

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
  cmd.option('--skip-preflight', 'skip preflight', false);
  cmd.option(
    '--tx-priority-fee <string>',
    'transaction priority fee can be [none : 0 mcLamports , normal : 1 mcLamports, high : 10 mcLamports, turbo : 100 mcLamports, custom : <number> mcLamports]',
    'none'
  );
  cmd.option(
    '--max-retries <number>',
    'maximum numbers of retries for sending failed txs',
    0
  );
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

export const extractBooleanString = (opts: Opts, name: string): boolean => {
  const value = opts[name];
  if (value !== 'true' && value !== 'false') {
    throw new Error(
      `${name} parameter value should be either 'true' or 'false'`
    );
  }

  return value === 'true' ? true : false;
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

export const fetchCoinGeckoTokenPrice = async (
  coinGeckoApiKey: string,
  coingeckoId: string
) => {
  const tokenPriceResponse = await fetch(
    `https://pro-api.coingecko.com/api/v3/simple/price?ids=${coingeckoId}&vs_currencies=usd&x_cg_pro_api_key=${coinGeckoApiKey}`
  );
  const tokenPriceJson: CoinGeckoResponse = await tokenPriceResponse.json();

  if (tokenPriceJson[coingeckoId]?.usd) {
    return Number(tokenPriceJson[coingeckoId]?.usd);
  }
  return undefined;
};

export const fetchBirdeyeTokenPrice = async (
  birdeyeApiKey: string,
  tokenAddress: string
) => {
  const options = {
    method: 'GET',
    headers: { 'X-API-KEY': birdeyeApiKey },
  };

  const tokenPriceResponse = await fetch(
    `https://public-api.birdeye.so/defi/price?address=${tokenAddress}`,
    options
  );
  const tokenPriceJson: any = await tokenPriceResponse.json();
  if (tokenPriceJson?.success === true) {
    return Number(tokenPriceJson?.data?.value);
  }
  return undefined;
};

export const resolveTxPriorityArg = (
  txPriority: string
): TransactionPriority => {
  switch (txPriority) {
    case 'dynamic':
      return 'dynamic';
    case 'none':
      return 'none';
    case 'normal':
      return 'normal';
    case 'high':
      return 'high';
    case 'turbo':
      return 'turbo';
    default:
      try {
        const txPriorityInNumber = Number(txPriority);
        if (isNaN(txPriorityInNumber) || txPriorityInNumber < 0) {
          return 'none';
        }
        return txPriorityInNumber;
      } catch (e) {
        return 'none';
      }
  }
};

export const resolveMaxRetriesArg = (maxRetries: string): number => {
  const maxRetriesInNumber = Number(maxRetries);
  if (isNaN(maxRetriesInNumber) || maxRetriesInNumber < 0) {
    return 0;
  }
  return maxRetriesInNumber;
};

export async function expirationRetry<T>(
  fn: () => Promise<T>,
  opts: Opts
): Promise<T> {
  let { maxRetries } = opts;
  maxRetries = resolveMaxRetriesArg(maxRetries);
  if (maxRetries === 0) return await fn();
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      return await fn();
    } catch (error) {
      if (!isTransactionExpiredBlockheightExceededError(error)) throw error;
      retryCount++;
      console.error(`Attempt ${retryCount + 1} tx expired. Retrying...`);
    }
  }
  throw new Error('Max Tx Expiration retries exceeded');
}

function isTransactionExpiredBlockheightExceededError(error: unknown) {
  return (
    error instanceof Error &&
    error.message.includes('TransactionExpiredBlockheightExceededError')
  );
}
