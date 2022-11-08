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
  DeleteRfqInput,
  deleteRfqOperation,
  FindRfqByMintInput,
  findRfqByMintOperation,
  FindRfqByTokenInput,
  findNftByTokenOperation,
  FindNftsByCreatorInput,
  findNftsByCreatorOperation,
  FindNftsByMintListInput as FindRfqsByMintListInput,
  findNftsByMintListOperation as findRfqsByMintListOperation,
  FindNftsByOwnerInput,
  findNftsByOwnerOperation,
  LoadLegsInput,
  loadLegsOperation,
  UseRfqInput,
  useRfqOperation,
  VerifyRfqLegsInput,
  verifyRfqLegsOperation,
  VerifyRfqCreatorInput,
  verifyRfqCreatorOperation,
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
 * You can upload some custom JSON metadata and use its URI to create
 * a new NFT like so. The owner and update authority of this NFT will,
 * by default, be the current identity of the convergence instance.
 *
 * ```ts
 * const { uri } = await convergence
 *   .rfqs()
 *   .uploadMetadata({
 *     name: "My off-chain name",
 *     description: "My off-chain description",
 *     image: "https://arweave.net/123",
 *   };
 *
 * const { rfq } = await convergence
 *   .rfqs()
 *   .create({
 *     uri,
 *     name: 'My on-chain RFQ',
 *     sellerFeeBasisPoints: 250, // 2.5%
 *   };
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

  /** {@inheritDoc findNftByMintOperation} */
  findByMint(input: FindRfqByMintInput, options?: OperationOptions) {
    return this.convergence
      .operations()
      .execute(findRfqByMintOperation(input), options);
  }

  /** {@inheritDoc findNftByTokenOperation} */
  findByToken(input: FindRfqByTokenInput, options?: OperationOptions) {
    return this.convergence
      .operations()
      .execute(findNftByTokenOperation(input), options);
  }

  /** {@inheritDoc findNftsByCreatorOperation} */
  findAllByCreator(input: FindNftsByCreatorInput, options?: OperationOptions) {
    return this.convergence
      .operations()
      .execute(findNftsByCreatorOperation(input), options);
  }

  /** {@inheritDoc findNftsByMintListOperation} */
  findAllByMintList(
    input: FindRfqsByMintListInput,
    options?: OperationOptions
  ) {
    return this.convergence
      .operations()
      .execute(findRfqsByMintListOperation(input), options);
  }

  /** {@inheritDoc findNftsByOwnerOperation} */
  findAllByOwner(input: FindNftsByOwnerInput, options?: OperationOptions) {
    return this.convergence
      .operations()
      .execute(findNftsByOwnerOperation(input), options);
  }

  /** {@inheritDoc loadMetadataOperation} */
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
   * rfqWithToken = await convergence.rfqs().refresh(rfqWithToken);
   * ```
   */
  refresh<T extends Rfq | PublicKey>(
    model: T,
    input?: Omit<
      FindRfqByMintInput,
      'mintAddress' | 'tokenAddres' | 'tokenOwner'
    >,
    options?: OperationOptions
  ): Promise<T extends Metadata | PublicKey ? Rfq : T> {
    return this.findByMint(
      {
        mintAddress: toMintAddress(model),
        tokenAddress: undefined,
        //tokenAddress: 'token' in model ? model.token.address : undefined,
        ...input,
      },
      options
    ) as Promise<T extends Metadata | PublicKey ? Rfq : T>;
  }

  /** {@inheritDoc createNftOperation} */
  create(input: CreateRfqInput, options?: OperationOptions) {
    return this.convergence
      .operations()
      .execute(createRfqOperation(input), options);
  }

  /** {@inheritDoc deleteNftOperation} */
  delete(input: DeleteRfqInput, options?: OperationOptions) {
    return this.convergence
      .operations()
      .execute(deleteRfqOperation(input), options);
  }

  /** {@inheritDoc useNftOperation} */
  use(input: UseRfqInput, options?: OperationOptions) {
    return this.convergence
      .operations()
      .execute(useRfqOperation(input), options);
  }

  /** {@inheritDoc verifyNftCreatorOperation} */
  verifyCreator(input: VerifyRfqCreatorInput, options?: OperationOptions) {
    return this.convergence
      .operations()
      .execute(verifyRfqCreatorOperation(input), options);
  }

  /** {@inheritDoc verifyNftCollectionOperation} */
  verifyCollection(input: VerifyRfqLegsInput, options?: OperationOptions) {
    return this.convergence
      .operations()
      .execute(verifyRfqLegsOperation(input), options);
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
