import {
  RiskCategory,
  InstrumentType,
  OrderType,
  StoredRfqState,
} from '@convergence-rfq/sdk';

export const getOrderType = (orderType: OrderType): string => {
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

export const getState = (state: StoredRfqState): string => {
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

export const getRiskCategoryIndex = (category: string): RiskCategory => {
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
