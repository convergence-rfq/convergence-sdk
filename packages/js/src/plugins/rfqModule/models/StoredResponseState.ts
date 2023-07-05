import { StoredResponseState as SolitaStoredResponseState } from '@convergence-rfq/rfq';

export type StoredResponseState =
  | 'active'
  | 'canceled'
  | 'defaulted'
  | 'ready-for-settling'
  | 'settled'
  | 'settling-preparations'
  | 'waiting-for-last-look'

export function fromSolitaStoredResponseState(StoredResponseState: SolitaStoredResponseState): StoredResponseState {
  switch (StoredResponseState) {
    case SolitaStoredResponseState.Active: {
      return 'active';
    }
    case SolitaStoredResponseState.Canceled: {
      return 'canceled';
    }
    case SolitaStoredResponseState.Defaulted: {
      return 'defaulted';
    }
    case SolitaStoredResponseState.ReadyForSettling: {
      return 'ready-for-settling';
    }
    case SolitaStoredResponseState.Settled: {
      return 'settled';
    }
    case SolitaStoredResponseState.SettlingPreparations: {
      return 'settling-preparations';
    }
    case SolitaStoredResponseState.WaitingForLastLook: {
      return 'waiting-for-last-look';
    }
  }
}

export function toSolitaStoredResponseState(StoredResponseState: StoredResponseState): SolitaStoredResponseState {
  switch (StoredResponseState) {
    case 'active': {
      return SolitaStoredResponseState.Active;
    }
    case 'canceled': {
      return SolitaStoredResponseState.Canceled;
    }
    case 'defaulted': {
      return SolitaStoredResponseState.Defaulted;
    }
    case 'ready-for-settling': {
      return SolitaStoredResponseState.ReadyForSettling;
    }
    case 'settled': {
      return SolitaStoredResponseState.Settled;
    }
    case 'settling-preparations': {
      return SolitaStoredResponseState.SettlingPreparations;
    }
    case 'waiting-for-last-look': {
      return SolitaStoredResponseState.WaitingForLastLook;
    }
  }
}
