import { OrderType as SolitaOrderType } from "@convergence-rfq/rfq";

type Buy = 'buy';
type Sell = 'sell';
type TwoWay = 'two-way';

export type OrderType = Buy | Sell | TwoWay;

export function fromSolitaOrderType(orderType: SolitaOrderType): OrderType {
  switch(orderType) {
    case SolitaOrderType.Buy: {
      return 'buy';
    }
    case SolitaOrderType.Sell: {
      return 'sell';
    }
    case SolitaOrderType.TwoWay: {
      return 'two-way';
    }
  }
}

export function toSolitaOrderType(orderType: OrderType): SolitaOrderType {
  switch(orderType) {
    case 'buy': {
      return SolitaOrderType.Buy;
    }
    case 'sell': {
      return SolitaOrderType.Sell;
    }
    case 'two-way': {
      return SolitaOrderType.TwoWay;
    }
  }
}
