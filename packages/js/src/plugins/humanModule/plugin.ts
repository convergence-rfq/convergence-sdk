import type { Convergence } from '../../Convergence';
import { ConvergencePlugin } from '../../types';
import { HumanClient } from './HumanClient';

/** @group Plugins */
export const humanModule = (): ConvergencePlugin => ({
  install(convergence: Convergence) {
    convergence.human = function () {
      return new HumanClient(this);
    };
  },
});

declare module '../../Convergence' {
  interface Convergence {
    human(): HumanClient;
  }
}
