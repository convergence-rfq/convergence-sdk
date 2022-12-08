import { cusper } from '@metaplex-foundation/mpl-token-metadata';
import { PROGRAM_ID } from '@convergence-rfq/rfq';
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
  addInstrumentOperation,
  addInstrumentOperationHandler,
  cancelRfqOperation,
  cancelRfqOperationHandler,
  respondOperationHandler,
  respondOperation,
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
  findRfqByAddressOperation,
  findRfqByAddressOperationHandler,
  findRfqsByAddressesOperation,
  findRfqsByAddressesOperationHandler,
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
  withdrawCollateralOperation,
  withdrawCollateralOperationHandler,
} from './operations';
import { ErrorWithLogs, ConvergencePlugin, Program } from '@/types';
import type { Convergence } from '@/Convergence';

/** @group Plugins */
export const rfqModule = (): ConvergencePlugin => ({
  install(convergence: Convergence) {
    const rfqProgram = {
      name: 'RfqProgram',
      address: PROGRAM_ID,
      errorResolver: (error: ErrorWithLogs) =>
        cusper.errorFromProgramLogs(error.logs, false),
    };
    convergence.programs().register(rfqProgram);
    convergence.programs().getRfq = function (
      this: ProgramClient,
      programs?: Program[]
    ) {
      return this.get(rfqProgram.name, programs);
    };

    const op = convergence.operations();

    op.register(addInstrumentOperation, addInstrumentOperationHandler);
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
      finalizeRfqConstructionOperation,
      finalizeRfqConstructionOperationHandler
    );
    op.register(findRfqByAddressOperation, findRfqByAddressOperationHandler);
    op.register(
      findRfqsByAddressesOperation,
      findRfqsByAddressesOperationHandler
    );
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
    op.register(respondOperation, respondOperationHandler);
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
      withdrawCollateralOperation,
      withdrawCollateralOperationHandler
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
