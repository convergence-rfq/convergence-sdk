import { ProgramClient } from '../programModule';
import { RfqClient } from './RfqClient';
import {
  createRfqOperation,
  createRfqOperationHandler,
  findRfqsByInstrumentOperation,
  findRfqsByInstrumentOperationHandler,
  findRfqsByTokenOperation,
  findRfqsByTokenOperationHandler,
  findRfqsByOwnerOperation,
  findRfqsByOwnerOperationHandler,
  cancelRfqOperation,
  cancelRfqOperationHandler,
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
  cleanUpRfqOperation,
  cleanUpRfqOperationHandler,
  finalizeRfqConstructionOperation,
  finalizeRfqConstructionOperationHandler,
  cancelResponseOperation,
  cancelResponseOperationHandler,
  confirmResponseOperation,
  confirmResponseOperationHandler,
  findResponseByAddressOperation,
  findResponseByAddressOperationHandler,
  findRfqByAddressOperation,
  findRfqByAddressOperationHandler,
  findRfqsByAddressesOperation,
  findRfqsByAddressesOperationHandler,
  findRfqsByActiveOperation,
  findRfqsByActiveOperationHandler,
  partiallySettleLegsOperation,
  partiallySettleLegsOperationHandler,
  prepareMoreLegsSettlementOperation,
  prepareMoreLegsSettlementOperationHandler,
  partlyRevertSettlementPreparationOperation,
  partlyRevertSettlementPreparationOperationHandler,
  prepareSettlementOperation,
  prepareSettlementOperationHandler,
  settleOperation,
  settleOperationHandler,
  settleOnePartyDefaultOperation,
  settleOnePartyDefaultOperationHandler,
  settleTwoPartyDefaultOperation,
  settleTwoPartyDefaultOperationHandler,
  unlockResponseCollateralOperation,
  unlockResponseCollateralOperationHandler,
  unlockRfqCollateralOperation,
  unlockRfqCollateralOperationHandler,
  createAndFinalizeRfqConstructionOperation,
  createAndFinalizeRfqConstructionOperationHandler,
} from './operations';
import { rfqProgram } from './program';
import { ConvergencePlugin, Program } from '@/types';
import type { Convergence } from '@/Convergence';

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
    op.register(cancelRfqOperation, cancelRfqOperationHandler);
    op.register(cleanUpResponseOperation, cleanUpResponseOperationHandler);
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
    op.register(findRfqByAddressOperation, findRfqByAddressOperationHandler);
    op.register(
      findRfqsByAddressesOperation,
      findRfqsByAddressesOperationHandler
    );
    op.register(findRfqsByActiveOperation, findRfqsByActiveOperationHandler);
    op.register(
      findRfqsByInstrumentOperation,
      findRfqsByInstrumentOperationHandler
    );
    op.register(findRfqsByOwnerOperation, findRfqsByOwnerOperationHandler);
    op.register(findRfqsByTokenOperation, findRfqsByTokenOperationHandler);
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
