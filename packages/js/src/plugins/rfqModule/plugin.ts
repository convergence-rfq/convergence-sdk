import { cusper, PROGRAM_ID } from '@metaplex-foundation/mpl-token-metadata';
import { ProgramClient } from '../programModule';
import { RfqClient } from './RfqClient';
import {
  createRfqOperation,
  createRfqOperationHandler,
  findRfqsByInstrumentOperation,
  findRfqByMintOperationHandler,
  findRfqsByInstrumentOperation,
  findRfqByTokenOperationHandler,
  findRfqsByOwnerOperation,
  findRfqsByOwnerOperationHandler,
  loadLegsOperation,
  loadMetadataOperationHandler,
  useRfqOperation,
  useRfqOperationHandler,
} from './operations';
import { ErrorWithLogs, ConvergencePlugin, Program } from '@/types';
import type { Convergence } from '@/Convergence';

/** @group Plugins */
export const rfqModule = (): ConvergencePlugin => ({
  install(convergence: Convergence) {
    // Token Metadata Program.
    const tokenMetadataProgram = {
      name: 'TokenMetadataProgram',
      address: PROGRAM_ID,
      errorResolver: (error: ErrorWithLogs) =>
        cusper.errorFromProgramLogs(error.logs, false),
    };
    convergence.programs().register(tokenMetadataProgram);
    convergence.programs().getTokenMetadata = function (
      this: ProgramClient,
      programs?: Program[]
    ) {
      return this.get(tokenMetadataProgram.name, programs);
    };

    // Operations.
    const op = convergence.operations();
    op.register(createRfqOperation, createRfqOperationHandler);
    op.register(findRfqsByInstrumentOperation, findRfqByMintOperationHandler);
    op.register(findRfqsByInstrumentOperation, findRfqByTokenOperationHandler);
    op.register(findRfqsByOwnerOperation, findRfqsByOwnerOperationHandler);
    op.register(loadLegsOperation, loadMetadataOperationHandler);
    op.register(useRfqOperation, useRfqOperationHandler);

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
    getTokenMetadata(programs?: Program[]): Program;
  }
}
