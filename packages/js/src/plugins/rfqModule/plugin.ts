import { cusper, PROGRAM_ID } from '@metaplex-foundation/mpl-token-metadata';
import { ProgramClient } from '../programModule';
import { RfqClient } from './RfqClient';
import {
  createRfqOperation,
  createRfqOperationHandler,
  findNftByMetadataOperation,
  findNftByMetadataOperationHandler,
  findRfqByMintOperation,
  findRfqByMintOperationHandler,
  findNftByTokenOperation,
  findRfqByTokenOperationHandler,
  findNftsByCreatorOperation,
  findNftsByCreatorOperationHandler,
  findNftsByMintListOperation,
  findNftsByMintListOperationHandler,
  findNftsByOwnerOperation,
  findNftsByOwnerOperationHandler,
  findNftsByUpdateAuthorityOperation,
  findNftsByUpdateAuthorityOperationHandler,
  loadMetadataOperation,
  loadMetadataOperationHandler,
  uploadMetadataOperation,
  uploadMetadataOperationHandler,
  useRfqOperation,
  useRfqOperationHandler,
  verifyRfqLegsOperation,
  verifyRfqLegsOperationHandler,
  verifyRfqCreatorOperation,
  verifyRfqCreatorOperationHandler,
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
    op.register(findNftByMetadataOperation, findNftByMetadataOperationHandler);
    op.register(findRfqByMintOperation, findRfqByMintOperationHandler);
    op.register(findNftByTokenOperation, findRfqByTokenOperationHandler);
    op.register(findNftsByCreatorOperation, findNftsByCreatorOperationHandler);
    op.register(
      findNftsByMintListOperation,
      findNftsByMintListOperationHandler
    );
    op.register(findNftsByOwnerOperation, findNftsByOwnerOperationHandler);
    op.register(
      findNftsByUpdateAuthorityOperation,
      findNftsByUpdateAuthorityOperationHandler
    );
    op.register(loadMetadataOperation, loadMetadataOperationHandler);
    op.register(uploadMetadataOperation, uploadMetadataOperationHandler);
    op.register(useRfqOperation, useRfqOperationHandler);
    op.register(verifyRfqLegsOperation, verifyRfqLegsOperationHandler);
    op.register(verifyRfqCreatorOperation, verifyRfqCreatorOperationHandler);

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
