import { Keypair } from "@solana/web3.js";
import { KeypairIdentityDriver } from "./KeypairIdentityDriver";
import { ConvergenceRfq } from "@/ConvergenceRfq";
import { ConvergenceRfqPlugin } from "@/types";

export const keypairIdentity = (keypair: Keypair): ConvergenceRfqPlugin => ({
  install(cvg: ConvergenceRfq) {
    cvg.identity().setDriver(new KeypairIdentityDriver(keypair));
  },
});
