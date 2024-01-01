import {
  findWhitelistByAddressOperation,
  findWhitelistByAddressOperationHandler,
  findWhitelistsByCreatorOperation,
  findWhitelistsByCreatorOperationHandler,
  createWhitelistOperation,
  createWhitelistOperationHandler,
  addAddressToWhitelistOperation,
  addAddressToWhitelistOperationHandler,
  removeAddressFromWhitelistOperation,
  removeAddressFromWhitelistOperationHandler,
  checkAddressExistsOnWhitelistOperation,
  checkAddressExistsOnWhitelistOperationHandler,
  cleanUpWhitelistOperation,
  cleanUpWhitelistOperationHandler,
} from './operations';
import { WhitelistClient } from './WhitelistClient';
import { ConvergencePlugin } from '@/types';
import type { Convergence } from '@/Convergence';

/** @group Plugins */
export const whitelistModule = (): ConvergencePlugin => ({
  install(convergence: Convergence) {
    const op = convergence.operations();

    op.register(createWhitelistOperation, createWhitelistOperationHandler);
    op.register(
      findWhitelistByAddressOperation,
      findWhitelistByAddressOperationHandler
    );
    op.register(
      findWhitelistsByCreatorOperation,
      findWhitelistsByCreatorOperationHandler
    );
    op.register(
      addAddressToWhitelistOperation,
      addAddressToWhitelistOperationHandler
    );
    op.register(
      removeAddressFromWhitelistOperation,
      removeAddressFromWhitelistOperationHandler
    );
    op.register(
      checkAddressExistsOnWhitelistOperation,
      checkAddressExistsOnWhitelistOperationHandler
    );

    op.register(cleanUpWhitelistOperation, cleanUpWhitelistOperationHandler);

    convergence.whitelist = function () {
      return new WhitelistClient(this);
    };
  },
});

declare module '../../Convergence' {
  interface Convergence {
    whitelist(): WhitelistClient;
  }
}
