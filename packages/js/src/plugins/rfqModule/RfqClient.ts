import { Metadata } from '@metaplex-foundation/mpl-token-metadata';
import { PublicKey } from '@solana/web3.js';
import { SendTokensInput } from '../tokenModule';
import { toMintAddress } from './helpers';
import { Rfq } from './models';
import { RfqBuildersClient } from './RfqBuildersClient';
import { RfqPdasClient } from './RfqPdasClient';
import {
  CreateRfqInput,
  createRfqOperation,
  CancelRfqInput,
  cancelRfqOperation,
  FindRfqsByAddressInput,
  FindRfqsByTokenInput,
  findRfqsByTokenOperation,
  FindRfqsByInstrumentInput,
  findRfqsByInstrumentOperation,
  FindRfqsByOwnerInput,
  findRfqsByOwnerOperation,
  RespondInput,
  LoadLegsInput,
  loadLegsOperation,
  findRfqsByAddressOperation,
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
  findByAddress(input: FindRfqsByAddressInput, options?: OperationOptions) {
    return this.convergence
      .operations()
      .execute(findRfqsByAddressOperation(input), options);
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

  /** {@inheritDoc loadLegsOperation} */
  load(input: LoadLegsInput, options?: OperationOptions) {
    return this.convergence
      .operations()
      .execute(loadLegsOperation(input), options);
  }

  /**
   * Helper method that refetches a given model
   * and returns an instance of the same type.
   *
   * ```ts
   * rfq = await convergence.rfqs().refresh(rfq);
   * ```
   */
  refresh<T extends Rfq | PublicKey>(
    model: T,
    input?: Omit<
      FindRfqsByTokenInput,
      'mintAddress' | 'tokenAddres' | 'tokenOwner'
    >,
    options?: OperationOptions
  ): Promise<T extends Metadata | PublicKey ? Rfq : T> {
    return this.findByToken(
      {
        mintAddress: toMintAddress(model),
        tokenAddress: undefined,
        //tokenAddress: 'token' in model ? model.token.address : undefined,
        ...input,
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

  /** {@inheritDoc cancelRfqOperation} */
  delete(input: CancelRfqInput, options?: OperationOptions) {
    return this.convergence
      .operations()
      .execute(cancelRfqOperation(input), options);
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
