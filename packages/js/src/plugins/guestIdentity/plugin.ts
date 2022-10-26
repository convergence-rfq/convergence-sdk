import { PublicKey } from '@solana/web3.js';
import { GuestIdentityDriver } from './GuestIdentityDriver';
import { Convergence } from '@/Convergence';
import { ConvergencePlugin } from '@/types';

/** @group Plugins */
export const guestIdentity = (publicKey?: PublicKey): ConvergencePlugin => ({
  install(convergence: Convergence) {
    convergence.identity().setDriver(new GuestIdentityDriver(publicKey));
  },
});
