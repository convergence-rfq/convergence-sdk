import { PROGRAM_ID as HXRO_PRINT_TRADE_PROVIDER_PROGRAM_ID } from '@convergence-rfq/hxro-print-trade-provider';
import {
  Program as AnchorProgram,
  AnchorProvider,
  Wallet,
} from '@coral-xyz/anchor';
import { Keypair } from '@solana/web3.js';
import { Convergence } from '@/Convergence';
import { Program } from '@/types';
import { GpaBuilder, NoopWallet } from '@/utils';

export const hxroPrintTradeProviderProgram: Program = {
  name: 'HxroPrintTradeProviderProgram',
  address: HXRO_PRINT_TRADE_PROVIDER_PROGRAM_ID,
  gpaResolver: (convergence: Convergence) => {
    return new GpaBuilder(convergence, HXRO_PRINT_TRADE_PROVIDER_PROGRAM_ID);
  },
};

export const getHxroProgramFromIDL = async (
  cvg: Convergence,
  hxroManifest: any
) => {
  const idl = await import('./dex.json');
  // @ts-ignore
  const RISK_IDL: Idl = idl;

  const provider = new AnchorProvider(
    cvg.connection,
    new NoopWallet(Keypair.generate().publicKey) as Wallet,
    {}
  );
  return new AnchorProgram(
    RISK_IDL,
    hxroManifest.fields.dexProgram.programId,
    provider
  );
};
