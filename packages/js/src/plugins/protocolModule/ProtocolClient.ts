import {
  InitializeProtocolInput,
  initializeProtocolOperation,
} from './operations';
import { OperationOptions } from '@/types';
import type { Convergence } from '@/Convergence';

/**
 * This is a client for the protocol module.
 *
 * It enables us to manage the protocol.
 *
 * You may access this client via the `protocol()` method of your `Convergence` instance.
 *
 * ```ts
 * const protocolClient = convergence.protocol();
 * ```
 *
 * @example
 * ```ts
 * const { protocol } = await convergence
 *   .protocol()
 *   .initialize();
 * ```
 *
 * @group Modules
 */
export class ProtocolClient {
  constructor(protected readonly convergence: Convergence) {}

  /** {@inheritDoc initializeProtocolOperation} */
  initialize(input: InitializeProtocolInput, options?: OperationOptions) {
    return this.convergence
      .operations()
      .execute(initializeProtocolOperation(input), options);
  }
}
