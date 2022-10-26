import { IdentityClient } from "./IdentityClient";
import type { ConvergenceRfq } from "@/ConvergenceRfq";
import { ConvergenceRfqPlugin } from "@/types";

/** @group Plugins */
export const identityModule = (): ConvergenceRfqPlugin => ({
  install(cvg: ConvergenceRfq) {
    const identityClient = new IdentityClient();
    cvg.identity = () => identityClient;
  },
});

declare module "../../ConvergenceRfq" {
  interface ConvergenceRfq {
    identity(): IdentityClient;
  }
}
