import type { AccountInfo, PublicKey } from '@solana/web3.js';
import type { Convergence } from '@/Convergence';

type AccountChangeListener = (accountInfo: AccountInfo<Buffer>) => void;

export class AccountSubscriptionClient {
  constructor(protected readonly convergence: Convergence) {}

  subscribe(account: PublicKey, listener: AccountChangeListener) {
    const subscriptionId = this.convergence.connection.onAccountChange(
      account,
      listener,
      'confirmed'
    );
    return subscriptionId;
  }

  unsubscribe(subscriptionId: number) {
    return this.convergence.connection.removeAccountChangeListener(
      subscriptionId
    );
  }
}
