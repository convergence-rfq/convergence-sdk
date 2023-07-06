import * as anchor from '@project-serum/anchor';
import { PublicKey, Keypair } from '@solana/web3.js';
import * as psyoptionsAmerican from '@mithraic-labs/psy-american';

import { Convergence } from '../../Convergence';
import { CvgWallet } from '../../utils';

export const createAmericanProgram = (
  convergence: Convergence,
  wallet?: CvgWallet
): any => {
  const provider = new anchor.AnchorProvider(
    convergence.connection,
    wallet ?? new anchor.Wallet(Keypair.generate()),
    {}
  );

  const americanProgram = psyoptionsAmerican.createProgram(
    new PublicKey('R2y9ip6mxmWUj4pt54jP2hz2dgvMozy9VTSwMWE7evs'),
    provider
  );

  return americanProgram;
};
