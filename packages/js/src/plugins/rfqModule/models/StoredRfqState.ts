import { StoredRfqState as SolitaStoredRfqState } from "@convergence-rfq/rfq";

type Constructed = 'constructed';
type Active = 'active';
type Canceled = 'canceled';

export type StoredRfqState = Constructed | Active | Canceled;

export function fromSolitaStoredRfqState(state: SolitaStoredRfqState): StoredRfqState {
  switch(state) {
    case SolitaStoredRfqState.Constructed: {
      return 'constructed';
    }
    case SolitaStoredRfqState.Active: {
      return 'active';
    }
    case SolitaStoredRfqState.Canceled: {
      return 'canceled';
    }
  }
}

export function toSolitaStoredRfqState(state: StoredRfqState): SolitaStoredRfqState {
  switch(state) {
    case 'constructed': {
      return SolitaStoredRfqState.Constructed;
    }
    case 'active': {
      return SolitaStoredRfqState.Active;
    }
    case 'canceled': {
      return SolitaStoredRfqState.Canceled;
    }
  }
}
