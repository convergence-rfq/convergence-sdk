import {
  Keypair,
  PublicKey,
  Transaction,
  VersionedTransaction,
} from '@solana/web3.js';
import { Convergence } from '..';

interface Wallet {
  signTransaction(tx: Transaction): Promise<Transaction>;
  signAllTransactions(txs: Transaction[]): Promise<Transaction[]>;
  publicKey: PublicKey;
}

export class CvgWallet implements Wallet {
  payer: Keypair;
  convergence: Convergence;
  publicKey: PublicKey;

  constructor(convergence: Convergence) {
    this.convergence = convergence;
    this.payer = convergence.rpc().getDefaultFeePayer() as Keypair;
    this.publicKey = convergence.identity().publicKey;
  }

  signTransaction = <T extends Transaction | VersionedTransaction>(
    tx: T
  ): Promise<T> => {
    if (tx instanceof VersionedTransaction) {
      throw new Error('Versioned transactions are not supported yet');
    }

    return this.convergence.identity().signTransaction(tx) as Promise<T>;
  };

  signAllTransactions = <T extends Transaction | VersionedTransaction>(
    txs: T[]
  ): Promise<T[]> => {
    if (txs.find((tx) => tx instanceof VersionedTransaction) !== undefined) {
      throw new Error('Versioned transactions are not supported yet');
    }

    return this.convergence
      .identity()
      .signAllTransactions(txs as Transaction[]) as Promise<T[]>;
  };
}

export class NoopWallet {
  public readonly publicKey: PublicKey;

  constructor(publicKey: PublicKey) {
    this.publicKey = publicKey;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  signTransaction(tx: Transaction): Promise<Transaction> {
    throw new Error('This Method is not expected to be called.');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  signAllTransactions(txs: Transaction[]): Promise<Transaction[]> {
    throw new Error('This Method is not expected to be called.');
  }
}
