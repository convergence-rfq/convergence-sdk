import {
  RiskCategory,
  InstrumentType,
  OrderType,
  Side,
  StoredRfqState,
  FixedSize,
} from '@convergence-rfq/sdk';

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

// TODO: Account for legs multiplier bps and quote amount
export const getSize = (size: string): FixedSize => {
  switch (size) {
    case 'fixed-base':
      return { __kind: 'BaseAsset', legsMultiplierBps: 1 };
    case 'fixed-quote':
      return { __kind: 'QuoteAsset', quoteAmount: 1 };
    case 'open':
      return { __kind: 'None', padding: 0 };
    default:
      throw new Error('Invalid size');
  }
};

export const getOrderType = (orderType: string): OrderType => {
  switch (orderType) {
    case 'buy':
      return OrderType.Buy;
    case 'sell':
      return OrderType.Sell;
    case 'two-way':
      return OrderType.TwoWay;
    default:
      throw new Error('Invalid order type');
  }
};

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

export const getRiskCategory = (category: string): RiskCategory => {
  switch (category) {
    case 'very-low':
      return RiskCategory.VeryLow;
    case 'low':
      return RiskCategory.Low;
    case 'medium':
      return RiskCategory.Medium;
    case 'high':
      return RiskCategory.High;
    case 'very-high':
      return RiskCategory.VeryHigh;
    default:
      throw new Error('Invalid risk category');
  }
};

export const formatState = (state: StoredRfqState): string => {
  switch (state) {
    case StoredRfqState.Constructed:
      return 'constructed';
    case StoredRfqState.Active:
      return 'active';
    case StoredRfqState.Canceled:
      return 'canceled';
    default:
      throw new Error('Invalid state');
  }
};

export const formatOrderType = (orderType: OrderType): string => {
  switch (orderType) {
    case OrderType.Buy:
      return 'buy';
    case OrderType.Sell:
      return 'sell';
    case OrderType.TwoWay:
      return 'two-way';
    default:
      throw new Error('Invalid order type');
  }
};

export const formatInstrument = (instrument: Instrument): string => {
  switch (instrument.model) {
    case 'spotInstrument':
      return 'spot';
    case 'psyoptionsAmericanInstrument':
      return 'psyoptions american option';
    case 'psyoptionsEuropeanInstrument':
      return 'psyoptions european option';
    default:
      throw new Error('Invalid instrument');
  }
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
