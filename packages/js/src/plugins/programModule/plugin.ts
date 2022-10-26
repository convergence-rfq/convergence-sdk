import { ProgramClient } from './ProgramClient';
import type { Convergence } from '@/Convergence';
import { ConvergencePlugin } from '@/types';

/** @group Plugins */
export const programModule = (): ConvergencePlugin => ({
  install(convergence: Convergence) {
    const programClient = new ProgramClient(convergence);
    convergence.programs = () => programClient;
  },
});

declare module '../../Convergence' {
  interface Convergence {
    programs(): ProgramClient;
  }
}
