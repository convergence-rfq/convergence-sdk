import { StoredRfqState as SolitaStoredRfqState } from '@convergence-rfq/rfq';

type Constructed = 'constructed';
type ValidatedByPrintTradeProvider = 'validated-by-print-trade-provider';
type Active = 'active';
type Canceled = 'canceled';

export type StoredRfqState =
  | Constructed
  | ValidatedByPrintTradeProvider
  | Active
  | Canceled;

export function fromSolitaStoredRfqState(
  state: SolitaStoredRfqState
): StoredRfqState {
  switch (state) {
    case SolitaStoredRfqState.Constructed: {
      return 'constructed';
    }
    case SolitaStoredRfqState.ValidatedByPrintTradeProvider: {
      return 'validated-by-print-trade-provider';
    }
    case SolitaStoredRfqState.Active: {
      return 'active';
    }
    case SolitaStoredRfqState.Canceled: {
      return 'canceled';
    }
  }
}

export function toSolitaStoredRfqState(
  state: StoredRfqState
): SolitaStoredRfqState {
  switch (state) {
    case 'constructed': {
      return SolitaStoredRfqState.Constructed;
    }
    case 'validated-by-print-trade-provider': {
      return SolitaStoredRfqState.ValidatedByPrintTradeProvider;
    }
    case 'active': {
      return SolitaStoredRfqState.Active;
    }
    case 'canceled': {
      return SolitaStoredRfqState.Canceled;
    }
  }
}
