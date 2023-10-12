import { ProgramClient } from '../programModule';
import { ConvergencePlugin, Program } from '../../types';
import type { Convergence } from '../../Convergence';
import { RfqClient } from './RfqClient';
import {
  createRfqOperation,
  createRfqOperationHandler,
  cancelRfqOperation,
  cancelRfqOperationHandler,
  cancelResponseOperation,
  cancelResponseOperationHandler,
  respondToRfqOperationHandler,
  respondToRfqOperation,
  cleanUpResponseOperation,
  cleanUpResponseOperationHandler,
  cleanUpResponsesOperation,
  cleanUpResponsesOperationHandler,
  cleanUpRfqOperation,
  cleanUpRfqOperationHandler,
  confirmResponseOperation,
  confirmResponseOperationHandler,
  findResponseByAddressOperation,
  findResponseByAddressOperationHandler,
  findResponsesByRfqOperation,
  findResponsesByRfqOperationHandler,
  findResponsesByOwnerOperation,
  findResponsesByOwnerOperationHandler,
  findRfqByAddressOperation,
  findRfqByAddressOperationHandler,
  findRfqsOperation,
  findRfqsOperationHandler,
  settleOperation,
  settleOperationHandler,
  cancelRfqsOperation,
  cancelRfqsOperationHandler,
  cancelResponsesOperation,
  cancelResponsesOperationHandler,
  unlockResponseCollateralOperation,
  unlockResponseCollateralOperationHandler,
  unlockResponsesCollateralOperation,
  unlockResponsesCollateralOperationHandler,
  cleanUpRfqsOperation,
  cleanUpRfqsOperationHandler,
  getSettlementResultOperation,
  getSettlementResultHandler,
} from './operations';
import { rfqProgram } from './program';

/** @group Plugins */
export const rfqModule = (): ConvergencePlugin => ({
  install(convergence: Convergence) {
    convergence.programs().register(rfqProgram);
    convergence.programs().getRfq = function (
      this: ProgramClient,
      programs?: Program[]
    ) {
      return this.get(rfqProgram.name, programs);
    };

    const op = convergence.operations();
    op.register(cancelResponseOperation, cancelResponseOperationHandler);
    op.register(cancelResponsesOperation, cancelResponsesOperationHandler);
    op.register(cancelRfqOperation, cancelRfqOperationHandler);
    op.register(cleanUpResponsesOperation, cleanUpResponsesOperationHandler);
    op.register(cleanUpRfqOperation, cleanUpRfqOperationHandler);
    op.register(confirmResponseOperation, confirmResponseOperationHandler);
    op.register(createRfqOperation, createRfqOperationHandler);
    op.register(
      findResponseByAddressOperation,
      findResponseByAddressOperationHandler
    );
    op.register(
      findResponsesByRfqOperation,
      findResponsesByRfqOperationHandler
    );
    op.register(
      findResponsesByOwnerOperation,
      findResponsesByOwnerOperationHandler
    );
    op.register(findRfqByAddressOperation, findRfqByAddressOperationHandler);
    op.register(findRfqsOperation, findRfqsOperationHandler);
    op.register(respondToRfqOperation, respondToRfqOperationHandler);
    op.register(settleOperation, settleOperationHandler);
    op.register(
      unlockResponseCollateralOperation,
      unlockResponseCollateralOperationHandler
    );
    op.register(cancelRfqsOperation, cancelRfqsOperationHandler);
    op.register(cancelResponsesOperation, cancelResponsesOperationHandler);
    op.register(cleanUpResponseOperation, cleanUpResponseOperationHandler);
    op.register(cleanUpRfqsOperation, cleanUpRfqsOperationHandler);
    op.register(
      unlockResponseCollateralOperation,
      unlockResponseCollateralOperationHandler
    );
    op.register(
      unlockResponsesCollateralOperation,
      unlockResponsesCollateralOperationHandler
    );
    op.register(getSettlementResultOperation, getSettlementResultHandler);

    convergence.rfqs = function () {
      return new RfqClient(this);
    };
  },
});

declare module '../../Convergence' {
  interface Convergence {
    rfqs(): RfqClient;
  }
}

declare module '../programModule/ProgramClient' {
  interface ProgramClient {
    getRfq(programs?: Program[]): Program;
  }
}
