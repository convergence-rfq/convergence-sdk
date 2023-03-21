import { Convergence } from '../../Convergence';
import { ConvergencePlugin } from '../../types';
import {
  WalletAdapterIdentityDriver,
  WalletAdapter,
} from './WalletAdapterIdentityDriver';

export const walletAdapterIdentity = (
  walletAdapter: WalletAdapter
): ConvergencePlugin => ({
  install(cvg: Convergence) {
    cvg.identity().setDriver(new WalletAdapterIdentityDriver(walletAdapter));
  },
});
