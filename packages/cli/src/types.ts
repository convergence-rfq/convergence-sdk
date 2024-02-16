import {
  SpotLegInstrument,
  PsyoptionsAmericanInstrument,
  PsyoptionsEuropeanInstrument,
  HxroLeg,
} from '@convergence-rfq/sdk';

export type Instrument =
  | SpotLegInstrument
  | PsyoptionsAmericanInstrument
  | PsyoptionsEuropeanInstrument
  | HxroLeg;

export type JupTokenList = {
  address: string;
  chainId: number;
  decimals: number;
  name: string;
  symbol: string;
  logoURI: string;
  tags: string[];
  extensions: {
    coingeckoId: string;
  };
};

export type CoinGeckoResponse = {
  [key: string]: {
    usd: number;
  };
};
