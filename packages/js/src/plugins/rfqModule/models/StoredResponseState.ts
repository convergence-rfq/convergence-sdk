import { StoredResponseState as SolitaStoredResponseState } from '@convergence-rfq/rfq';

export type StoredResponseState =
  | 'active'
  | 'canceled'
  | 'confirmed'
  | 'settled';

export function fromSolitaStoredResponseState(
  StoredResponseState: SolitaStoredResponseState
): StoredResponseState {
  switch (StoredResponseState) {
    case SolitaStoredResponseState.Active: {
      return 'active';
    }
    case SolitaStoredResponseState.Canceled: {
      return 'canceled';
    }
    case SolitaStoredResponseState.Confirmed: {
      return 'confirmed';
    }
    case SolitaStoredResponseState.Settled: {
      return 'settled';
    }
  }
}

export function toSolitaStoredResponseState(
  StoredResponseState: StoredResponseState
): SolitaStoredResponseState {
  switch (StoredResponseState) {
    case 'active': {
      return SolitaStoredResponseState.Active;
    }
    case 'canceled': {
      return SolitaStoredResponseState.Canceled;
    }
    case 'confirmed': {
      return SolitaStoredResponseState.Confirmed;
    }
    case 'settled': {
      return SolitaStoredResponseState.Settled;
    }
  }
}
