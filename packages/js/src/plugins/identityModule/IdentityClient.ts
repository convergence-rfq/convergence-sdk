import * as ed25519 from '@noble/ed25519';
import { PublicKey, Transaction } from '@solana/web3.js';

import {
  HasDriver,
  IdentitySigner,
  isSigner,
  KeypairSigner,
  Signer,
} from '../../types';
import { DriverNotProvidedError } from '../../errors';
import { IdentityDriver } from './IdentityDriver';

/**
 * @group Modules
 */
export class IdentityClient
  implements HasDriver<IdentityDriver>, IdentitySigner
{
  private _driver: IdentityDriver | null = null;

  driver(): IdentityDriver {
    if (!this._driver) {
      throw new DriverNotProvidedError('IdentityDriver');
    }

    return this._driver;
  }

  setDriver(newDriver: IdentityDriver): void {
    this._driver = newDriver;
  }

  get publicKey(): PublicKey {
    return this.driver().publicKey;
  }

  get secretKey(): Uint8Array | undefined {
    return this.driver().secretKey;
  }

  signMessage(message: Uint8Array): Promise<Uint8Array> {
    return this.driver().signMessage(message);
  }

  signTransaction(transaction: Transaction): Promise<Transaction> {
    return this.driver().signTransaction(transaction);
  }

  signAllTransactions(transactions: Transaction[]): Promise<Transaction[]> {
    return this.driver().signAllTransactions(transactions);
  }

  async signTransactionMatrix(
    ...transactionMatrix: Transaction[][]
  ): Promise<Transaction[][]> {
    const txLengths = transactionMatrix.map((txs) => txs.length);
    const flattendedTransactions = transactionMatrix.flat();
    const flattendedSignedTransactions = await this.signAllTransactions(
      flattendedTransactions
    );
    const constructedTxMatrix = txLengths.map((len) =>
      flattendedSignedTransactions.splice(0, len)
    );

    return constructedTxMatrix;
  }

  verifyMessage(message: Uint8Array, signature: Uint8Array): boolean {
    return ed25519.sync.verify(message, signature, this.publicKey.toBytes());
  }

  equals(that: Signer | PublicKey): boolean {
    if (isSigner(that)) {
      that = that.publicKey;
    }

    return this.publicKey.equals(that);
  }

  hasSecretKey(): this is KeypairSigner {
    return this.secretKey != null;
  }
}
