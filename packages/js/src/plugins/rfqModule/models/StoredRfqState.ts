import { StoredRfqState as SolitaStoredRfqState } from '@convergence-rfq/rfq';

type Active = 'active';
type Canceled = 'canceled';

export type StoredRfqState = Active | Canceled;

export function fromSolitaStoredRfqState(
  state: SolitaStoredRfqState
): StoredRfqState {
  switch (state) {
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
    case 'active': {
      return SolitaStoredRfqState.Active;
    }
    case 'canceled': {
      return SolitaStoredRfqState.Canceled;
    }
  }
}
