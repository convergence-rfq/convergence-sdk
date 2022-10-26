import { BundlrOptions, BundlrStorageDriver } from './BundlrStorageDriver';
import { Convergence } from '@/Convergence';
import { ConvergencePlugin } from '@/types';

export const bundlrStorage = (
  options: BundlrOptions = {}
): ConvergencePlugin => ({
  install(convergence: Convergence) {
    convergence
      .storage()
      .setDriver(new BundlrStorageDriver(convergence, options));
  },
});
