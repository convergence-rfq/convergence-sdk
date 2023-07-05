import type { Convergence } from '../../Convergence';
import { ConvergencePlugin } from '../../types';
import { AccountSubscriptionClient } from './AccountSubscriptionClient';

/** @group Plugins */
export const accountModule = (): ConvergencePlugin => ({
  install(convergence: Convergence) {
    convergence.account = new AccountSubscriptionClient(convergence);
  },
});

declare module '../../Convergence' {
  interface Convergence {
    account: AccountSubscriptionClient;
  }
}
