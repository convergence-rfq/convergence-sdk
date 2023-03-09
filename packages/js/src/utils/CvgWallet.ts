import { Keypair, PublicKey, Transaction } from '@solana/web3.js';
import { Convergence, Signer } from '..';

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
    this.publicKey = convergence.rpc().getDefaultFeePayer().publicKey;
  }

  signTransaction = (tx: Transaction): Promise<Transaction> => {
    return this.convergence.rpc().signTransaction(tx, [this.payer as Signer]);
  };

  signAllTransactions = (txs: Transaction[]): Promise<Transaction[]> => {
    return this.convergence
      .rpc()
      .signAllTransactions(txs, [this.payer as Signer]);
  };
}
