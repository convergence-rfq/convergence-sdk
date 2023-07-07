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
  partiallySettleLegsOperation,
  partiallySettleLegsOperationHandler,
  prepareMoreLegsSettlementOperation,
  prepareMoreLegsSettlementOperationHandler,
  partlyRevertSettlementPreparationOperation,
  partlyRevertSettlementPreparationOperationHandler,
  partiallySettleLegsAndSettleOperation,
  partiallySettleLegsAndSettleOperationHandler,
  prepareSettlementOperation,
  prepareSettlementOperationHandler,
  prepareSettlementAndPrepareMoreLegsOperation,
  prepareSettlementAndPrepareMoreLegsOperationHandler,
  settleOperation,
  settleOperationHandler,
  settleOnePartyDefaultOperation,
  settleOnePartyDefaultOperationHandler,
  settleTwoPartyDefaultOperation,
  settleTwoPartyDefaultOperationHandler,
  unlockRfqCollateralOperation,
  unlockRfqCollateralOperationHandler,
  createAndFinalizeRfqConstructionOperation,
  createAndFinalizeRfqConstructionOperationHandler,
  createAndAddLegsToRfqOperation,
  createAndAddLegsToRfqOperationHandler,
  cancelRfqsOperation,
  cancelRfqsOperationHandler,
  cancelResponsesOperation,
  cancelResponsesOperationHandler,
  unlockResponseCollateralOperation,
  unlockResponseCollateralOperationHandler,
  unlockMultipleRfqCollateralOperation,
  unlockMultipleRfqCollateralOperationHandler,
  cleanUpMultipleRfqOperation,
  cleanUpMultipleRfqOperationHandler,
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
      partiallySettleLegsOperation,
      partiallySettleLegsOperationHandler
    );
    op.register(
      partlyRevertSettlementPreparationOperation,
      partlyRevertSettlementPreparationOperationHandler
    );
    op.register(
      prepareMoreLegsSettlementOperation,
      prepareMoreLegsSettlementOperationHandler
    );
    op.register(prepareSettlementOperation, prepareSettlementOperationHandler);
    op.register(respondToRfqOperation, respondToRfqOperationHandler);
    op.register(settleOperation, settleOperationHandler);
    op.register(
      settleOnePartyDefaultOperation,
      settleOnePartyDefaultOperationHandler
    );
    op.register(
      settleTwoPartyDefaultOperation,
      settleTwoPartyDefaultOperationHandler
    );
    op.register(
      unlockResponseCollateralOperation,
      unlockResponseCollateralOperationHandler
    );
    op.register(
      unlockRfqCollateralOperation,
      unlockRfqCollateralOperationHandler
    );
    op.register(
      createAndAddLegsToRfqOperation,
      createAndAddLegsToRfqOperationHandler
    );
    op.register(
      prepareSettlementAndPrepareMoreLegsOperation,
      prepareSettlementAndPrepareMoreLegsOperationHandler
    );
    op.register(
      partiallySettleLegsAndSettleOperation,
      partiallySettleLegsAndSettleOperationHandler
    );
    op.register(cancelRfqsOperation, cancelRfqsOperationHandler);
    op.register(cancelResponsesOperation, cancelResponsesOperationHandler);
    op.register(cleanUpResponsesOperation, cleanUpResponsesOperationHandler);
    op.register(
      cleanUpMultipleRfqOperation,
      cleanUpMultipleRfqOperationHandler
    );
    op.register(
      unlockResponseCollateralOperation,
      unlockResponseCollateralOperationHandler
    );
    op.register(
      unlockMultipleRfqCollateralOperation,
      unlockMultipleRfqCollateralOperationHandler
    );

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
