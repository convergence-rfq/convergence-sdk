import { cusper } from '@metaplex-foundation/mpl-token-metadata';
import { PROGRAM_ID } from '@convergence-rfq/rfq';
import { ProgramClient } from '../programModule';
import { RfqClient } from './RfqClient';
import {
  createRfqOperation,
  createRfqOperationHandler,
  findRfqsByInstrumentOperation,
  findRfqByTokenOperationHandler,
  findRfqsByOwnerOperation,
  findRfqsByOwnerOperationHandler,
  loadLegsOperation,
  loadMetadataOperationHandler,
  cancelRfqOperation,
  cancelRfqOperationHandler,
  respondOperationHandler,
  respondOperation,
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
    op.register(createRfqOperation, createRfqOperationHandler);
    op.register(cancelRfqOperation, cancelRfqOperationHandler);
    op.register(findRfqsByInstrumentOperation, findRfqByTokenOperationHandler);
    op.register(findRfqsByOwnerOperation, findRfqsByOwnerOperationHandler);
    op.register(loadLegsOperation, loadMetadataOperationHandler);
    op.register(respondOperation, respondOperationHandler);

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
