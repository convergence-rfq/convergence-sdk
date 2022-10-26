import { RpcClient } from './RpcClient';
import type { Convergence } from '@/Convergence';
import { ConvergencePlugin } from '@/types';

/** @group Plugins */
export const rpcModule = (): ConvergencePlugin => ({
  install(cvg: Convergence) {
    const rpcClient = new RpcClient(cvg);
    cvg.rpc = () => rpcClient;
  },
});

declare module '../../Convergence' {
  interface Convergence {
    rpc(): RpcClient;
  }
}
