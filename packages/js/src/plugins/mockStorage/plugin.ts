import { MockStorageDriver, MockStorageOptions } from './MockStorageDriver';
import { Convergence } from '@/Convergence';
import { ConvergencePlugin } from '@/types';

export const mockStorage = (
  options?: MockStorageOptions
): ConvergencePlugin => ({
  install(convergence: Convergence) {
    convergence.storage().setDriver(new MockStorageDriver(options));
  },
});
