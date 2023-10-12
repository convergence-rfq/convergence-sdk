import { ProtocolClient } from './ProtocolClient';
import {
  initializeProtocolOperation,
  initializeProtocolOperationHandler,
  getProtocolOperation,
  getProtocolOperationHandler,
  closeProtocolOperation,
  closeProtocolOperationHandler,
} from './operations';
import { Protocol } from './models';
import { ConvergencePlugin } from '@/types';
import type { Convergence } from '@/Convergence';

/** @group Plugins */
export const protocolModule = (): ConvergencePlugin => ({
  install(convergence: Convergence) {
    const op = convergence.operations();
    op.register(
      initializeProtocolOperation,
      initializeProtocolOperationHandler
    );
    op.register(getProtocolOperation, getProtocolOperationHandler);
    op.register(closeProtocolOperation, closeProtocolOperationHandler);

    convergence.protocol = function () {
      return new ProtocolClient(this);
    };
  },
});

declare module '../../Convergence' {
  interface Convergence {
    protocol(): ProtocolClient;
  }
}

declare module '../protocolModule/ProtocolClient' {
  interface ProtocolClient {
    getProtocol(): Protocol;
  }
}
