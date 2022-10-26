import { Keypair } from "@solana/web3.js";
import { KeypairIdentityDriver } from "./KeypairIdentityDriver";
import { Convergence } from "@/Convergence";
import { ConvergencePlugin } from "@/types";

export const keypairIdentity = (keypair: Keypair): ConvergencePlugin => ({
  install(convergence: Convergence) {
    convergence.identity().setDriver(new KeypairIdentityDriver(keypair));
  },
});
