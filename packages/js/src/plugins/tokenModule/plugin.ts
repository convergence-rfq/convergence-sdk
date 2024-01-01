import { ProgramClient } from '../programModule';
import {
  approveTokenDelegateAuthorityOperation,
  approveTokenDelegateAuthorityOperationHandler,
  createMintOperation,
  createMintOperationHandler,
  createTokenOperation,
  createTokenOperationHandler,
  createTokenWithMintOperation,
  createTokenWithMintOperationHandler,
  findMintByAddressOperation,
  findMintByAddressOperationHandler,
  findTokenByAddressOperation,
  findTokenByAddressOperationHandler,
  findTokenWithMintByAddressOperation,
  findTokenWithMintByAddressOperationHandler,
  findTokenWithMintByMintOperation,
  findTokenWithMintByMintOperationHandler,
  freezeTokensOperation,
  freezeTokensOperationHandler,
  getTokenBalanceOperationHandler,
  getTokenBalanceOperation,
  mintTokensOperation,
  mintTokensOperationHandler,
  revokeTokenDelegateAuthorityOperation,
  revokeTokenDelegateAuthorityOperationHandler,
  sendTokensOperation,
  sendTokensOperationHandler,
  thawTokensOperation,
  thawTokensOperationHandler,
} from './operations';
import { associatedTokenProgram, tokenProgram } from './program';
import { TokenClient } from './TokenClient';
import type { ConvergencePlugin, Program } from '@/types';
import type { Convergence } from '@/Convergence';

/**
 * @group Plugins
 */
/** @group Plugins */
export const tokenModule = (): ConvergencePlugin => ({
  install(convergence: Convergence) {
    // Token Program.
    convergence.programs().register(tokenProgram);
    convergence.programs().getToken = function (
      this: ProgramClient,
      programs?: Program[]
    ) {
      return this.get(tokenProgram.name, programs);
    };

    // Associated Token Program.
    convergence.programs().register(associatedTokenProgram);
    convergence.programs().getAssociatedToken = function (
      this: ProgramClient,
      programs?: Program[]
    ) {
      return this.get(associatedTokenProgram.name, programs);
    };

    // Operations.
    const op = convergence.operations();
    op.register(
      approveTokenDelegateAuthorityOperation,
      approveTokenDelegateAuthorityOperationHandler
    );
    op.register(createMintOperation, createMintOperationHandler);
    op.register(createTokenOperation, createTokenOperationHandler);
    op.register(
      createTokenWithMintOperation,
      createTokenWithMintOperationHandler
    );
    op.register(findMintByAddressOperation, findMintByAddressOperationHandler);
    op.register(
      findTokenByAddressOperation,
      findTokenByAddressOperationHandler
    );
    op.register(
      findTokenByAddressOperation,
      findTokenByAddressOperationHandler
    );
    op.register(
      findTokenWithMintByAddressOperation,
      findTokenWithMintByAddressOperationHandler
    );
    op.register(
      findTokenWithMintByMintOperation,
      findTokenWithMintByMintOperationHandler
    );
    op.register(freezeTokensOperation, freezeTokensOperationHandler);
    op.register(mintTokensOperation, mintTokensOperationHandler);
    op.register(
      revokeTokenDelegateAuthorityOperation,
      revokeTokenDelegateAuthorityOperationHandler
    );
    op.register(sendTokensOperation, sendTokensOperationHandler);
    op.register(thawTokensOperation, thawTokensOperationHandler);

    op.register(getTokenBalanceOperation, getTokenBalanceOperationHandler);

    convergence.tokens = function () {
      return new TokenClient(this);
    };
  },
});

declare module '../../Convergence' {
  interface Convergence {
    tokens(): TokenClient;
  }
}

declare module '../programModule/ProgramClient' {
  interface ProgramClient {
    getToken(programs?: Program[]): Program;
    getAssociatedToken(programs?: Program[]): Program;
  }
}
