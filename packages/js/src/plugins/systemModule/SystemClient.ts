import {
  CreateAccountInput,
  createAccountOperation,
  TransferSolInput,
  transferSolOperation,
} from './operations';
import { SystemBuildersClient } from './SystemBuildersClient';
import type { Convergence } from '@/Convergence';
import { OperationOptions } from '@/types';

/**
 * This is a client for the System module.
 *
 * It enables us to interact with the System program in order to
 * create uninitialized accounts and transfer SOL.
 *
 * You may access this client via the `system()` method of your `Convergence` instance.
 *
 * ```ts
 * const systemClient = convergence.system();
 * ```
 *
 * @example
 * You can create a new uninitialized account with a given space in bytes
 * using the code below.
 *
 * ```ts
 * const { newAccount } = await convergence.system().createAccount({ space: 42 });
 * ```
 *
 * @group Modules
 */
export class SystemClient {
  constructor(protected readonly convergence: Convergence) {}

  /**
   * You may use the `builders()` client to access the
   * underlying Transaction Builders of this module.
   *
   * ```ts
   * const buildersClient = convergence.system().builders();
   * ```
   */
  builders() {
    return new SystemBuildersClient(this.convergence);
  }

  /** {@inheritDoc createAccountOperation} */
  createAccount(input: CreateAccountInput, options?: OperationOptions) {
    return this.convergence
      .operations()
      .execute(createAccountOperation(input), options);
  }

  /** {@inheritDoc transferSolOperation} */
  transferSol(input: TransferSolInput, options?: OperationOptions) {
    return this.convergence
      .operations()
      .execute(transferSolOperation(input), options);
  }
}
