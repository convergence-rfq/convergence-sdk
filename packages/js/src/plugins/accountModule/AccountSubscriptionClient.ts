import { AccountInfo } from "@solana/web3.js";
import type { Convergence, PublicKey } from '../..';

type AccountChangeListener = (accountInfo: AccountInfo<Buffer>) => void;

export class AccountSubscriptionClient {
  constructor(protected readonly convergence: Convergence) {}

  subscribe(account: PublicKey, listener: AccountChangeListener) {
    const subscriptionId = this.convergence.connection.onAccountChange(
      account, 
      listener,
      "confirmed"
    );
    return subscriptionId;
  }

  unsubscribe(subscriptionId: number) {
    return this.convergence.connection.removeAccountChangeListener(subscriptionId);
  }
}
