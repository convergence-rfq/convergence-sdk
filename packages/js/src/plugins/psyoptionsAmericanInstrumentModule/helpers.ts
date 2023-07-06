import * as anchor from '@project-serum/anchor';
import { Transaction, PublicKey, Keypair } from '@solana/web3.js';
import * as psyoptionsAmerican from '@mithraic-labs/psy-american';

import { Convergence } from '../../Convergence';
import { CvgWallet } from '@/index';

export class NoopWallet {
  public readonly publicKey: PublicKey;

  constructor(keypair: Keypair) {
    this.publicKey = keypair.publicKey;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  signTransaction(tx: Transaction): Promise<Transaction> {
    throw new Error('Method not implemented.');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  signAllTransactions(txs: Transaction[]): Promise<Transaction[]> {
    throw new Error('Method not implemented.');
  }
}

export const createAmericanProgram = (
  convergence: Convergence,
  wallet?: CvgWallet
): any => {
  const provider = new anchor.AnchorProvider(
    convergence.connection,
    wallet ?? new NoopWallet(Keypair.generate()),
    {}
  );

  const americanProgram = psyoptionsAmerican.createProgram(
    new PublicKey('R2y9ip6mxmWUj4pt54jP2hz2dgvMozy9VTSwMWE7evs'),
    provider
  );

  return americanProgram;
};
