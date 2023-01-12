import { Buffer } from 'buffer';
import { PublicKey } from '@solana/web3.js';
import { PROGRAM_ID } from '@metaplex-foundation/mpl-token-metadata';
import { Pda } from '@/types';

/**
 * @group Pdas
 * @deprecated Please use `convergence.rfqs().pdas().metadata(...)` instead.
 */
export const findMetadataPda = (
  mint: PublicKey,
  programId: PublicKey = PROGRAM_ID
): Pda => {
  return Pda.find(programId, [
    Buffer.from('metadata', 'utf8'),
    programId.toBuffer(),
    mint.toBuffer(),
  ]);
};
