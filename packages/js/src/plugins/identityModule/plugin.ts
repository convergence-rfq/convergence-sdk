import { IdentityClient } from './IdentityClient';
import type { Convergence } from '@/Convergence';
import { ConvergencePlugin } from '@/types';

/** @group Plugins */
export const identityModule = (): ConvergencePlugin => ({
  install(convergence: Convergence) {
    const identityClient = new IdentityClient();
    convergence.identity = () => identityClient;
  },
});

declare module '../../Convergence' {
  interface Convergence {
    identity(): IdentityClient;
  }
}
