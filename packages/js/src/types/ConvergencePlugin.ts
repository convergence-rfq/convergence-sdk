import type { Convergence } from "../Convergence";

export type ConvergencePlugin = {
  install(convergence: Convergence): any;
};
