import { cusper, PROGRAM_ID } from '@metaplex-foundation/mpl-token-metadata';
import { ProgramClient } from '../programModule';
import { RfqClient } from './RfqClient';
import {
  approveNftCollectionAuthorityOperation,
  approveNftCollectionAuthorityOperationHandler,
  approveNftUseAuthorityOperation,
  approveNftUseAuthorityOperationHandler,
  createRfqOperation,
  createRfqOperationHandler,
  createSftOperation,
  createSftOperationHandler,
  deleteNftOperation,
  deleteNftOperationHandler,
  findNftByMetadataOperation,
  findNftByMetadataOperationHandler,
  findRfqByMintOperation,
  findRfqByMintOperationHandler,
  findNftByTokenOperation,
  findNftByTokenOperationHandler,
  findNftsByCreatorOperation,
  findNftsByCreatorOperationHandler,
  findNftsByMintListOperation,
  findNftsByMintListOperationHandler,
  findNftsByOwnerOperation,
  findNftsByOwnerOperationHandler,
  findNftsByUpdateAuthorityOperation,
  findNftsByUpdateAuthorityOperationHandler,
  freezeDelegatedNftOperation,
  freezeDelegatedNftOperationHandler,
  loadMetadataOperation,
  loadMetadataOperationHandler,
  migrateToSizedCollectionNftOperation,
  migrateToSizedCollectionNftOperationHandler,
  printNewEditionOperation,
  printNewEditionOperationHandler,
  revokeNftCollectionAuthorityOperation,
  revokeNftCollectionAuthorityOperationHandler,
  revokeNftUseAuthorityOperation,
  revokeNftUseAuthorityOperationHandler,
  thawDelegatedNftOperation,
  thawDelegatedNftOperationHandler,
  unverifyNftCollectionOperation,
  unverifyNftCollectionOperationHandler,
  unverifyNftCreatorOperation,
  unverifyNftCreatorOperationHandler,
  updateNftOperation,
  updateNftOperationHandler,
  uploadMetadataOperation,
  uploadMetadataOperationHandler,
  useNftOperation,
  useNftOperationHandler,
  verifyNftCollectionOperation,
  verifyNftCollectionOperationHandler,
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
    op.register(
      approveNftCollectionAuthorityOperation,
      approveNftCollectionAuthorityOperationHandler
    );
    op.register(
      approveNftUseAuthorityOperation,
      approveNftUseAuthorityOperationHandler
    );
    op.register(createRfqOperation, createRfqOperationHandler);
    op.register(createSftOperation, createSftOperationHandler);
    op.register(deleteNftOperation, deleteNftOperationHandler);
    op.register(findNftByMetadataOperation, findNftByMetadataOperationHandler);
    op.register(findRfqByMintOperation, findRfqByMintOperationHandler);
    op.register(findNftByTokenOperation, findNftByTokenOperationHandler);
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
    op.register(
      freezeDelegatedNftOperation,
      freezeDelegatedNftOperationHandler
    );
    op.register(loadMetadataOperation, loadMetadataOperationHandler);
    op.register(
      migrateToSizedCollectionNftOperation,
      migrateToSizedCollectionNftOperationHandler
    );
    op.register(printNewEditionOperation, printNewEditionOperationHandler);
    op.register(
      revokeNftCollectionAuthorityOperation,
      revokeNftCollectionAuthorityOperationHandler
    );
    op.register(
      revokeNftUseAuthorityOperation,
      revokeNftUseAuthorityOperationHandler
    );
    op.register(thawDelegatedNftOperation, thawDelegatedNftOperationHandler);
    op.register(
      unverifyNftCollectionOperation,
      unverifyNftCollectionOperationHandler
    );
    op.register(
      unverifyNftCreatorOperation,
      unverifyNftCreatorOperationHandler
    );
    op.register(updateNftOperation, updateNftOperationHandler);
    op.register(uploadMetadataOperation, uploadMetadataOperationHandler);
    op.register(useNftOperation, useNftOperationHandler);
    op.register(
      verifyNftCollectionOperation,
      verifyNftCollectionOperationHandler
    );
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
