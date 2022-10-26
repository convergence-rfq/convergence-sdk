import { Metadata } from '@metaplex-foundation/mpl-token-metadata';
import { PublicKey } from '@solana/web3.js';
import { SendTokensInput } from '../tokenModule';
import { toMintAddress } from './helpers';
import { Rfq, RfqWithToken } from './models';
import { RfqBuildersClient } from './RfqBuildersClient';
import { RfqPdasClient } from './RfqPdasClient';
import {
  ApproveNftCollectionAuthorityInput,
  approveNftCollectionAuthorityOperation,
  ApproveNftUseAuthorityInput,
  approveNftUseAuthorityOperation,
  CreateRfqInput,
  createRfqOperation,
  CreateSftInput,
  createSftOperation,
  DeleteNftInput,
  deleteNftOperation,
  FindNftByMetadataInput,
  findNftByMetadataOperation,
  FindRfqByMintInput,
  findRfqByMintOperation,
  FindNftByTokenInput,
  findNftByTokenOperation,
  FindNftsByCreatorInput,
  findNftsByCreatorOperation,
  FindNftsByMintListInput,
  findNftsByMintListOperation,
  FindNftsByOwnerInput,
  findNftsByOwnerOperation,
  FindNftsByUpdateAuthorityInput,
  findNftsByUpdateAuthorityOperation,
  FreezeDelegatedNftInput,
  freezeDelegatedNftOperation,
  LoadMetadataInput,
  loadMetadataOperation,
  MigrateToSizedCollectionNftInput,
  migrateToSizedCollectionNftOperation,
  PrintNewEditionInput,
  printNewEditionOperation,
  RevokeNftCollectionAuthorityInput,
  revokeNftCollectionAuthorityOperation,
  RevokeNftUseAuthorityInput,
  revokeNftUseAuthorityOperation,
  ThawDelegatedNftInput,
  thawDelegatedNftOperation,
  UnverifyNftCollectionInput,
  unverifyNftCollectionOperation,
  UnverifyNftCreatorInput,
  unverifyNftCreatorOperation,
  UpdateNftInput,
  updateNftOperation,
  UploadMetadataInput,
  uploadMetadataOperation,
  UseNftInput,
  useNftOperation,
  VerifyNftCollectionInput,
  verifyNftCollectionOperation,
  VerifyRfqCreatorInput,
  verifyRfqCreatorOperation,
} from './operations';
import { PartialKeys } from '@/utils';
import { OperationOptions, token } from '@/types';
import type { Convergence } from '@/Convergence';

/**
 * This is a client for the NFT module.
 *
 * It enables us to interact with the Token Metadata program in order to
 * manage NFTs and SFTs.
 *
 * You may access this client via the `rfqs()()` method of your `Convergence` instance.
 *
 * ```ts
 * const nftClient = convergence.rfqs()();
 * ```
 *
 * @example
 * You can upload some custom JSON metadata and use its URI to create
 * a new NFT like so. The owner and update authority of this NFT will,
 * by default, be the current identity of the convergence instance.
 *
 * ```ts
 * const { uri } = await convergence
 *   .rfqs()()
 *   .uploadMetadata({
 *     name: "My off-chain name",
 *     description: "My off-chain description",
 *     image: "https://arweave.net/123",
 *   };
 *
 * const { nft } = await convergence
 *   .rfqs()()
 *   .create({
 *     uri,
 *     name: 'My on-chain NFT',
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

  // -----------------
  // Queries
  // -----------------

  /** {@inheritDoc findNftByMintOperation} */
  findByMint(input: FindRfqByMintInput, options?: OperationOptions) {
    return this.convergence
      .operations()
      .execute(findRfqByMintOperation(input), options);
  }

  /** {@inheritDoc findNftByMetadataOperation} */
  findByMetadata(input: FindNftByMetadataInput, options?: OperationOptions) {
    return this.convergence
      .operations()
      .execute(findNftByMetadataOperation(input), options);
  }

  /** {@inheritDoc findNftByTokenOperation} */
  findByToken(input: FindNftByTokenInput, options?: OperationOptions) {
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
    input: FindNftsByMintListInput,
    options?: OperationOptions
  ) {
    return this.convergence
      .operations()
      .execute(findNftsByMintListOperation(input), options);
  }

  /** {@inheritDoc findNftsByOwnerOperation} */
  findAllByOwner(input: FindNftsByOwnerInput, options?: OperationOptions) {
    return this.convergence
      .operations()
      .execute(findNftsByOwnerOperation(input), options);
  }

  /** {@inheritDoc findNftsByUpdateAuthorityOperation} */
  findAllByUpdateAuthority(
    input: FindNftsByUpdateAuthorityInput,
    options?: OperationOptions
  ) {
    return this.convergence
      .operations()
      .execute(findNftsByUpdateAuthorityOperation(input), options);
  }

  /** {@inheritDoc loadMetadataOperation} */
  load(input: LoadMetadataInput, options?: OperationOptions) {
    return this.convergence
      .operations()
      .execute(loadMetadataOperation(input), options);
  }

  /**
   * Helper method that refetches a given model
   * and returns an instance of the same type.
   *
   * ```ts
   * nft = await convergence.rfqs().refresh(nft);
   * sft = await convergence.rfqs().refresh(sft);
   * nftWithToken = await convergence.rfqs().refresh(nftWithToken);
   * ```
   */
  refresh<T extends Rfq | RfqWithToken | Metadata | PublicKey>(
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
        tokenAddress: 'token' in model ? model.token.address : undefined,
        ...input,
      },
      options
    ) as Promise<T extends Metadata | PublicKey ? Rfq : T>;
  }

  // -----------------
  // Create, Update and Delete
  // -----------------

  /** {@inheritDoc createNftOperation} */
  create(input: CreateRfqInput, options?: OperationOptions) {
    return this.convergence
      .operations()
      .execute(createRfqOperation(input), options);
  }

  /** {@inheritDoc createSftOperation} */
  createSft(input: CreateSftInput, options?: OperationOptions) {
    return this.convergence
      .operations()
      .execute(createSftOperation(input), options);
  }

  /** {@inheritDoc printNewEditionOperation} */
  printNewEdition(input: PrintNewEditionInput, options?: OperationOptions) {
    return this.convergence
      .operations()
      .execute(printNewEditionOperation(input), options);
  }

  /** {@inheritDoc uploadMetadataOperation} */
  uploadMetadata(input: UploadMetadataInput, options?: OperationOptions) {
    return this.convergence
      .operations()
      .execute(uploadMetadataOperation(input), options);
  }

  /** {@inheritDoc updateNftOperation} */
  update(input: UpdateNftInput, options?: OperationOptions) {
    return this.convergence
      .operations()
      .execute(updateNftOperation(input), options);
  }

  /** {@inheritDoc deleteNftOperation} */
  delete(input: DeleteNftInput, options?: OperationOptions) {
    return this.convergence
      .operations()
      .execute(deleteNftOperation(input), options);
  }

  // -----------------
  // Use
  // -----------------

  /** {@inheritDoc useNftOperation} */
  use(input: UseNftInput, options?: OperationOptions) {
    return this.convergence
      .operations()
      .execute(useNftOperation(input), options);
  }

  /** {@inheritDoc approveNftUseAuthorityOperation} */
  approveUseAuthority(
    input: ApproveNftUseAuthorityInput,
    options?: OperationOptions
  ) {
    return this.convergence
      .operations()
      .execute(approveNftUseAuthorityOperation(input), options);
  }

  /** {@inheritDoc revokeNftUseAuthorityOperation} */
  revokeUseAuthority(
    input: RevokeNftUseAuthorityInput,
    options?: OperationOptions
  ) {
    return this.convergence
      .operations()
      .execute(revokeNftUseAuthorityOperation(input), options);
  }

  // -----------------
  // Creators
  // -----------------

  /** {@inheritDoc verifyNftCreatorOperation} */
  verifyCreator(input: VerifyRfqCreatorInput, options?: OperationOptions) {
    return this.convergence
      .operations()
      .execute(verifyRfqCreatorOperation(input), options);
  }

  /** {@inheritDoc unverifyNftCreatorOperation} */
  unverifyCreator(input: UnverifyNftCreatorInput, options?: OperationOptions) {
    return this.convergence
      .operations()
      .execute(unverifyNftCreatorOperation(input), options);
  }

  // -----------------
  // Collections
  // -----------------

  /** {@inheritDoc verifyNftCollectionOperation} */
  verifyCollection(
    input: VerifyNftCollectionInput,
    options?: OperationOptions
  ) {
    return this.convergence
      .operations()
      .execute(verifyNftCollectionOperation(input), options);
  }

  /** {@inheritDoc unverifyNftCollectionOperation} */
  unverifyCollection(
    input: UnverifyNftCollectionInput,
    options?: OperationOptions
  ) {
    return this.convergence
      .operations()
      .execute(unverifyNftCollectionOperation(input), options);
  }

  /** {@inheritDoc approveNftCollectionAuthorityOperation} */
  approveCollectionAuthority(
    input: ApproveNftCollectionAuthorityInput,
    options?: OperationOptions
  ) {
    return this.convergence
      .operations()
      .execute(approveNftCollectionAuthorityOperation(input), options);
  }

  /** {@inheritDoc revokeNftCollectionAuthorityOperation} */
  revokeCollectionAuthority(
    input: RevokeNftCollectionAuthorityInput,
    options?: OperationOptions
  ) {
    return this.convergence
      .operations()
      .execute(revokeNftCollectionAuthorityOperation(input), options);
  }

  /** {@inheritDoc migrateToSizedCollectionNftOperation} */
  migrateToSizedCollection(
    input: MigrateToSizedCollectionNftInput,
    options?: OperationOptions
  ) {
    return this.convergence
      .operations()
      .execute(migrateToSizedCollectionNftOperation(input), options);
  }

  // -----------------
  // Tokens
  // -----------------

  /** {@inheritDoc freezeDelegatedNftOperation} */
  freezeDelegatedNft(
    input: FreezeDelegatedNftInput,
    options?: OperationOptions
  ) {
    return this.convergence
      .operations()
      .execute(freezeDelegatedNftOperation(input), options);
  }

  /** {@inheritDoc thawDelegatedNftOperation} */
  thawDelegatedNft(input: ThawDelegatedNftInput, options?: OperationOptions) {
    return this.convergence
      .operations()
      .execute(thawDelegatedNftOperation(input), options);
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
