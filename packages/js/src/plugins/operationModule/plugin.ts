import { OperationClient } from './OperationClient';
import type { Convergence } from '@/Convergence';
import { ConvergencePlugin } from '@/types';

/** @group Plugins */
export const operationModule = (): ConvergencePlugin => ({
  install(convergence: Convergence) {
    const operationClient = new OperationClient(convergence);
    convergence.operations = () => operationClient;
  },
});

declare module '../../Convergence' {
  interface Convergence {
    operations(): OperationClient;
  }
}
