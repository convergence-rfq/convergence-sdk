import { StorageClient } from './StorageClient';
import type { Convergence } from '@/Convergence';
import { ConvergencePlugin } from '@/types';

/** @group Plugins */
export const storageModule = (): ConvergencePlugin => ({
  install(convergence: Convergence) {
    const storageClient = new StorageClient();
    convergence.storage = () => storageClient;
  },
});

declare module '../../Convergence' {
  interface Convergence {
    storage(): StorageClient;
  }
}
