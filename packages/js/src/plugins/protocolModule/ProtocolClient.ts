import {
  AddInstrumentInput,
  addInstrumentOperation,
  InitializeProtocolInput,
  initializeProtocolOperation,
  GetProtocolInput,
  getProtocolOperation,
  RegisterMintInput,
  registerMintOperation,
  AddBaseAssetInput,
  addBaseAssetOperation,
} from './operations';
import { ProtocolPdasClient } from './ProtocolPdasClient';
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

  pdas() {
    return new ProtocolPdasClient(this.convergence);
  }

  /** {@inheritDoc initializeProtocolOperation} */
  initialize(input: InitializeProtocolInput, options?: OperationOptions) {
    return this.convergence
      .operations()
      .execute(initializeProtocolOperation(input), options);
  }
  /** {@inheritDoc addInstrumentOperation} */
  addInstrument(input: AddInstrumentInput, options?: OperationOptions) {
    return this.convergence
      .operations()
      .execute(addInstrumentOperation(input), options);
  }

  /** {@inheritDoc getProtocolOperation} */
  get(input?: GetProtocolInput, options?: OperationOptions) {
    return this.convergence
      .operations()
      .execute(getProtocolOperation(input), options);
  }

  /** {@inheritDoc addBaseAssetOperation} */
  addBaseAsset(input: AddBaseAssetInput, options?: OperationOptions) {
    return this.convergence
      .operations()
      .execute(addBaseAssetOperation(input), options);
  }

  /** {@inheritDoc registerMintOperation} */
  registerMint(input: RegisterMintInput, options?: OperationOptions) {
    return this.convergence
      .operations()
      .execute(registerMintOperation(input), options);
  }
}
