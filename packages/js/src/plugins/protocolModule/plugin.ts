import { ProtocolClient } from './ProtocolClient';
import {
  initializeProtocolOperation,
  initializeProtocolOperationHandler,
  getProtocolOperation,
  getProtocolOperationHandler,
  addInstrumentOperation,
  addInstrumentOperationHandler,
  addBaseAssetOperation,
  addBaseAssetOperationHandler,
  registerMintOperation,
  registerMintOperationHandler,
  getBaseAssetsOperation,
  getBaseAssetsOperationHandler,
  getRegisteredMintsOperation,
  getRegisteredMintsOperationHandler,
  findRegisteredMintByAddressOperation,
  findRegisteredMintByAddressOperationHandler,
  findBaseAssetByAddressOperation,
  findBaseAssetByAddressOperationHandler,
  closeProtocolOperation,
  closeProtocolOperationHandler,
  addPrintTradeProviderOperation,
  addPrintTradeProviderOperationHandler,
  changeBaseAssetParametersOperation,
  changeBaseAssetParametersOperationHandler,
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
    op.register(addInstrumentOperation, addInstrumentOperationHandler);
    op.register(
      addPrintTradeProviderOperation,
      addPrintTradeProviderOperationHandler
    );
    op.register(addBaseAssetOperation, addBaseAssetOperationHandler);
    op.register(
      changeBaseAssetParametersOperation,
      changeBaseAssetParametersOperationHandler
    );
    op.register(registerMintOperation, registerMintOperationHandler);
    op.register(getBaseAssetsOperation, getBaseAssetsOperationHandler);
    op.register(
      getRegisteredMintsOperation,
      getRegisteredMintsOperationHandler
    );
    op.register(
      findRegisteredMintByAddressOperation,
      findRegisteredMintByAddressOperationHandler
    );
    op.register(
      findBaseAssetByAddressOperation,
      findBaseAssetByAddressOperationHandler
    );
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
    // TODO this method actually does not exist
    getProtocol(): Protocol;
  }
}
