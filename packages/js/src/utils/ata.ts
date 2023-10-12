import { PublicKey } from '@solana/web3.js';
import { Convergence } from '../Convergence';
import { Program } from '../types';
import { TransactionBuilder } from '../utils/TransactionBuilder';
import { createTokenBuilder } from '@/plugins/tokenModule/operations/createToken';

export const getOrCreateATA = async (
  convergence: Convergence,
  mint: PublicKey,
  owner: PublicKey,
  programs?: Program[]
): Promise<PublicKey> => {
  const pda = convergence.tokens().pdas().associatedTokenAccount({
    mint,
    owner,
    programs,
  });
  const account = await convergence.rpc().getAccount(pda);

  const ata = account.exists
    ? pda
    : (
        await convergence.tokens().createToken({
          mint,
          owner,
        })
      ).token.address;

  return ata;
};

export interface GetOrCreateATAtxBuilderReturnType {
  ataPubKey: PublicKey;
  txBuilder?: TransactionBuilder;
}

export const getOrCreateATAtxBuilder = async (
  convergence: Convergence,
  mint: PublicKey,
  owner: PublicKey,
  programs?: Program[]
): Promise<GetOrCreateATAtxBuilderReturnType> => {
  const pda = convergence.tokens().pdas().associatedTokenAccount({
    mint,
    owner,
    programs,
  });
  const account = await convergence.rpc().getAccount(pda);
  if (!account.exists) {
    const txBuilder = await createTokenBuilder(convergence, {
      mint,
      owner,
    });
    return { ataPubKey: pda, txBuilder };
  }
  return { ataPubKey: pda };
};
