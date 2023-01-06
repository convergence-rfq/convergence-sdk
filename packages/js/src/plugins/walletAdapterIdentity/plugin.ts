import {
  WalletAdapterIdentityDriver,
  WalletAdapter,
} from './WalletAdapterIdentityDriver';
import { Convergence } from '@/Convergence';
import { ConvergencePlugin } from '@/types';

export const walletAdapterIdentity = (
  walletAdapter: WalletAdapter
): ConvergencePlugin => ({
  install(metaplex: Convergence) {
    metaplex
      .identity()
      .setDriver(new WalletAdapterIdentityDriver(walletAdapter));
  },
});
