import { Metadata } from '@metaplex-foundation/mpl-token-metadata';
import { PublicKey } from '@solana/web3.js';
import { SendTokensInput } from '../tokenModule';
import { Rfq } from './models';
import { RfqBuildersClient } from './RfqBuildersClient';
import { RfqPdasClient } from './RfqPdasClient';
import {
  CreateRfqInput,
  createRfqOperation,
  CancelRfqInput,
  cancelRfqOperation,
  FindRfqByAddressInput,
  FindRfqsByAddressesInput,
  FindRfqsByTokenInput,
  findRfqsByTokenOperation,
  FindRfqsByInstrumentInput,
  findRfqsByInstrumentOperation,
  FindRfqsByOwnerInput,
  findRfqsByOwnerOperation,
  RespondInput,
  findRfqByAddressOperation,
  findRfqsByAddressesOperation,
  respondOperation,
} from './operations';
import { PartialKeys } from '@/utils';
import { OperationOptions, token } from '@/types';
import type { Convergence } from '@/Convergence';

/**
 * This is a client for the Rfq module.
 *
 * It enables us to interact with the Rfq program in order to
 * manage Rfqs.
 *
 * You may access this client via the `rfqs()` method of your `Convergence` instance.
 *
 * ```ts
 * const rfqClient = convergence.rfqs();
 * ```
 *
 * @example
 * ```ts
 * const { rfq } = await convergence
 *   .rfqs()
 *   .create({
 *     side: 'buy',
 *   });
 * ```
 *
 * @group Modules
 */
export class RfqClient {
  constructor(protected readonly convergence: Convergence) {}

  /**
   * You may use the `builders()` client to access the
   * underlying Transaction Builders of this module.
   *
   * ```ts
   * const buildersClient = convergence.rfqs().builders();
   * ```
   */
  builders() {
    return new RfqBuildersClient(this.convergence);
  }

  /**
   * You may use the `pdas()` client to build PDAs related to this module.
   *
   * ```ts
   * const pdasClient = convergence.rfqs().pdas();
   * ```
   */
  pdas() {
    return new RfqPdasClient(this.convergence);
  }

  /** {@inheritDoc findRfqsByInstrumentOperation} */
  findByInstrument(
    input: FindRfqsByInstrumentInput,
    options?: OperationOptions
  ) {
    return this.convergence
      .operations()
      .execute(findRfqsByInstrumentOperation(input), options);
  }

  /** {@inheritDoc findRfqByAddressOperation} */
  findByAddress(input: FindRfqByAddressInput, options?: OperationOptions) {
    return this.convergence
      .operations()
      .execute(findRfqByAddressOperation(input), options);
  }

  /** {@inheritDoc findRfqsByAddressesOperation} */
  findByAddresses(input: FindRfqsByAddressesInput, options?: OperationOptions) {
    return this.convergence
      .operations()
      .execute(findRfqsByAddressesOperation(input), options);
  }

  /** {@inheritDoc findRfqsByTokenOperation} */
  findByToken(input: FindRfqsByTokenInput, options?: OperationOptions) {
    return this.convergence
      .operations()
      .execute(findRfqsByTokenOperation(input), options);
  }

  /** {@inheritDoc cancelRfqOperation} */
  cancelRfq(input: CancelRfqInput, options?: OperationOptions) {
    return this.convergence
      .operations()
      .execute(cancelRfqOperation(input), options);
  }

  /** {@inheritDoc findRfqsByOwnerOperation} */
  findAllByOwner(input: FindRfqsByOwnerInput, options?: OperationOptions) {
    return this.convergence
      .operations()
      .execute(findRfqsByOwnerOperation(input), options);
  }

  // /** {@inheritDoc loadLegsOperation} */
  // load(input: LoadLegsInput, options?: OperationOptions) {
  //   return this.convergence
  //     .operations()
  //     .execute(loadLegsOperation(input), options);
  // }

  /**
   * Helper method that refetches a given model
   * and returns an instance of the same type.
   *
   * If the model we pass is an `Rfq`, we extract the pubkey and
   * pass to `findByAddress`. Else, it's a pubkey and we pass
   * it directly.
   *
   * ```ts
   * rfq = await convergence.rfqs().refresh(rfq);
   * ```
   */
  refresh<T extends Rfq | PublicKey>(
    model: T,
    options?: OperationOptions
  ): Promise<T extends Metadata | PublicKey ? Rfq : T> {
    return this.findByAddress(
      {
        rfq: 'model' in model ? model.address : model,
      },
      options
    ) as Promise<T extends Metadata | PublicKey ? Rfq : T>;
  }

  /** {@inheritDoc createRfqOperation} */
  create(input: CreateRfqInput, options?: OperationOptions) {
    return this.convergence
      .operations()
      .execute(createRfqOperation(input), options);
  }

  /** {@inheritDoc respondOperation} */
  respond(input: RespondInput, options?: OperationOptions) {
    return this.convergence
      .operations()
      .execute(respondOperation(input), options);
  }

  /** {@inheritDoc sendTokensOperation} */
  send(
    input: PartialKeys<SendTokensInput, 'amount'>,
    options?: OperationOptions
  ) {
    return this.convergence
      .tokens()
      .send({ ...input, amount: token(1) }, options);
  }
}
