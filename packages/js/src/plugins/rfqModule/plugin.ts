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
  revertSettlementPreparationOperation,
  revertSettlementPreparationOperationHandler,
  addLegsToRfqOperation,
  addLegsToRfqOperationHandler,
  cleanUpResponseLegsOperation,
  cleanUpResponseLegsOperationHandler,
  cleanUpResponseOperation,
  cleanUpResponseOperationHandler,
  cleanUpResponsesOperation,
  cleanUpResponsesOperationHandler,
  cleanUpRfqOperation,
  cleanUpRfqOperationHandler,
  finalizeRfqConstructionOperation,
  finalizeRfqConstructionOperationHandler,
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
  prepareMoreLegsSettlementOperation,
  prepareMoreLegsSettlementOperationHandler,
  partlyRevertSettlementPreparationOperation,
  partlyRevertSettlementPreparationOperationHandler,
  prepareSettlementOperation,
  prepareSettlementOperationHandler,
  prepareSettlementAndPrepareMoreLegsOperation,
  prepareSettlementAndPrepareMoreLegsOperationHandler,
  settleOperation,
  settleOperationHandler,
  createAndFinalizeRfqConstructionOperation,
  createAndFinalizeRfqConstructionOperationHandler,
  cancelRfqsOperation,
  cancelRfqsOperationHandler,
  cancelResponsesOperation,
  cancelResponsesOperationHandler,
  cleanUpRfqsOperation,
  cleanUpRfqsOperationHandler,
  getSettlementResultOperation,
  getSettlementResultHandler,
  createPrintTradeRfqOperation,
  createPrintTradeRfqOperationHandler,
  preparePrintTradeSettlementOperationHandler,
  preparePrintTradeSettlementOperation,
  getResponseStateAndActionOperation,
  getResponseStateAndActionHandler,
} from './operations';
import { rfqProgram } from './program';
import {
  getRfqStateAndActionHandler,
  getRfqStateAndActionOperation,
} from './operations/getRfqStateAndAction';

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
    op.register(
      revertSettlementPreparationOperation,
      revertSettlementPreparationOperationHandler
    );
    op.register(addLegsToRfqOperation, addLegsToRfqOperationHandler);
    op.register(cancelResponseOperation, cancelResponseOperationHandler);
    op.register(cancelResponsesOperation, cancelResponsesOperationHandler);
    op.register(cancelRfqOperation, cancelRfqOperationHandler);
    op.register(cleanUpResponsesOperation, cleanUpResponsesOperationHandler);
    op.register(
      cleanUpResponseLegsOperation,
      cleanUpResponseLegsOperationHandler
    );
    op.register(cleanUpRfqOperation, cleanUpRfqOperationHandler);
    op.register(confirmResponseOperation, confirmResponseOperationHandler);
    op.register(createRfqOperation, createRfqOperationHandler);
    op.register(
      createAndFinalizeRfqConstructionOperation,
      createAndFinalizeRfqConstructionOperationHandler
    );
    op.register(
      createPrintTradeRfqOperation,
      createPrintTradeRfqOperationHandler
    );
    op.register(
      finalizeRfqConstructionOperation,
      finalizeRfqConstructionOperationHandler
    );
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
    op.register(
      partlyRevertSettlementPreparationOperation,
      partlyRevertSettlementPreparationOperationHandler
    );
    op.register(
      prepareMoreLegsSettlementOperation,
      prepareMoreLegsSettlementOperationHandler
    );
    op.register(prepareSettlementOperation, prepareSettlementOperationHandler);
    op.register(
      preparePrintTradeSettlementOperation,
      preparePrintTradeSettlementOperationHandler
    );
    op.register(respondToRfqOperation, respondToRfqOperationHandler);
    op.register(settleOperation, settleOperationHandler);
    op.register(
      prepareSettlementAndPrepareMoreLegsOperation,
      prepareSettlementAndPrepareMoreLegsOperationHandler
    );
    op.register(cancelRfqsOperation, cancelRfqsOperationHandler);
    op.register(cancelResponsesOperation, cancelResponsesOperationHandler);
    op.register(cleanUpResponseOperation, cleanUpResponseOperationHandler);
    op.register(cleanUpRfqsOperation, cleanUpRfqsOperationHandler);
    op.register(getSettlementResultOperation, getSettlementResultHandler);
    op.register(
      getResponseStateAndActionOperation,
      getResponseStateAndActionHandler
    );
    op.register(getRfqStateAndActionOperation, getRfqStateAndActionHandler);

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
