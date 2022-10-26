import {
  approveNftCollectionAuthorityBuilder,
  ApproveNftCollectionAuthorityBuilderParams,
  approveNftUseAuthorityBuilder,
  ApproveNftUseAuthorityBuilderParams,
  createRfqBuilder,
  CreateRfqBuilderParams as CreateRfqBuilderParams,
  createSftBuilder,
  CreateSftBuilderParams,
  deleteNftBuilder,
  DeleteNftBuilderParams,
  freezeDelegatedNftBuilder,
  FreezeDelegatedNftBuilderParams,
  migrateToSizedCollectionNftBuilder,
  MigrateToSizedCollectionNftBuilderParams,
  printNewEditionBuilder,
  PrintNewEditionBuilderParams,
  revokeNftCollectionAuthorityBuilder,
  RevokeNftCollectionAuthorityBuilderParams,
  revokeNftUseAuthorityBuilder,
  RevokeNftUseAuthorityBuilderParams,
  thawDelegatedNftBuilder,
  ThawDelegatedNftBuilderParams,
  unverifyNftCollectionBuilder,
  UnverifyNftCollectionBuilderParams,
  unverifyNftCreatorBuilder,
  UnverifyNftCreatorBuilderParams,
  updateNftBuilder,
  UpdateNftBuilderParams,
  useNftBuilder,
  UseNftBuilderParams,
  verifyNftCollectionBuilder,
  VerifyNftCollectionBuilderParams,
  verifyRfqCreatorBuilder,
  VerifyRfqCreatorBuilderParams,
} from './operations';
import type { Convergence } from '@/Convergence';
import { TransactionBuilderOptions } from '@/utils';

/**
 * This client allows you to access the underlying Transaction Builders
 * for the write operations of the NFT module.
 *
 * @see {@link NftClient}
 * @group Module Builders
 * */
export class RfqBuildersClient {
  constructor(protected readonly convergence: Convergence) {}

  // -----------------
  // Create, Update and Delete
  // -----------------

  /** {@inheritDoc createNftBuilder} */
  create(input: CreateRfqBuilderParams, options?: TransactionBuilderOptions) {
    return createRfqBuilder(this.convergence, input, options);
  }

  /** {@inheritDoc createSftBuilder} */
  createSft(
    input: CreateSftBuilderParams,
    options?: TransactionBuilderOptions
  ) {
    return createSftBuilder(this.convergence, input, options);
  }

  /** {@inheritDoc printNewEditionBuilder} */
  printNewEdition(
    input: PrintNewEditionBuilderParams,
    options?: TransactionBuilderOptions
  ) {
    return printNewEditionBuilder(this.convergence, input, options);
  }

  /** {@inheritDoc updateNftBuilder} */
  update(input: UpdateNftBuilderParams, options?: TransactionBuilderOptions) {
    return updateNftBuilder(this.convergence, input, options);
  }

  /** {@inheritDoc deleteNftBuilder} */
  delete(input: DeleteNftBuilderParams, options?: TransactionBuilderOptions) {
    return deleteNftBuilder(this.convergence, input, options);
  }

  // -----------------
  // Use
  // -----------------

  /** {@inheritDoc useNftBuilder} */
  use(input: UseNftBuilderParams, options?: TransactionBuilderOptions) {
    return useNftBuilder(this.convergence, input, options);
  }

  /** {@inheritDoc approveNftUseAuthorityBuilder} */
  approveUseAuthority(
    input: ApproveNftUseAuthorityBuilderParams,
    options?: TransactionBuilderOptions
  ) {
    return approveNftUseAuthorityBuilder(this.convergence, input, options);
  }

  /** {@inheritDoc revokeNftUseAuthorityBuilder} */
  revokeUseAuthority(
    input: RevokeNftUseAuthorityBuilderParams,
    options?: TransactionBuilderOptions
  ) {
    return revokeNftUseAuthorityBuilder(this.convergence, input, options);
  }

  // -----------------
  // Creators
  // -----------------

  /** {@inheritDoc verifyNftCreatorBuilder} */
  verifyCreator(
    input: VerifyRfqCreatorBuilderParams,
    options?: TransactionBuilderOptions
  ) {
    return verifyRfqCreatorBuilder(this.convergence, input, options);
  }

  /** {@inheritDoc unverifyNftCreatorBuilder} */
  unverifyCreator(
    input: UnverifyNftCreatorBuilderParams,
    options?: TransactionBuilderOptions
  ) {
    return unverifyNftCreatorBuilder(this.convergence, input, options);
  }

  // -----------------
  // Collections
  // -----------------

  /** {@inheritDoc verifyNftCollectionBuilder} */
  verifyCollection(
    input: VerifyNftCollectionBuilderParams,
    options?: TransactionBuilderOptions
  ) {
    return verifyNftCollectionBuilder(this.convergence, input, options);
  }

  /** {@inheritDoc unverifyNftCollectionBuilder} */
  unverifyCollection(
    input: UnverifyNftCollectionBuilderParams,
    options?: TransactionBuilderOptions
  ) {
    return unverifyNftCollectionBuilder(this.convergence, input, options);
  }

  /** {@inheritDoc approveNftCollectionAuthorityBuilder} */
  approveCollectionAuthority(
    input: ApproveNftCollectionAuthorityBuilderParams,
    options?: TransactionBuilderOptions
  ) {
    return approveNftCollectionAuthorityBuilder(
      this.convergence,
      input,
      options
    );
  }

  /** {@inheritDoc revokeNftCollectionAuthorityBuilder} */
  revokeCollectionAuthority(
    input: RevokeNftCollectionAuthorityBuilderParams,
    options?: TransactionBuilderOptions
  ) {
    return revokeNftCollectionAuthorityBuilder(
      this.convergence,
      input,
      options
    );
  }

  /** {@inheritDoc migrateToSizedCollectionNftBuilder} */
  migrateToSizedCollection(
    input: MigrateToSizedCollectionNftBuilderParams,
    options?: TransactionBuilderOptions
  ) {
    return migrateToSizedCollectionNftBuilder(this.convergence, input, options);
  }

  // -----------------
  // Token
  // -----------------

  /** {@inheritDoc freezeDelegatedNftBuilder} */
  freezeDelegatedNft(
    input: FreezeDelegatedNftBuilderParams,
    options?: TransactionBuilderOptions
  ) {
    return freezeDelegatedNftBuilder(this.convergence, input, options);
  }

  /** {@inheritDoc thawDelegatedNftBuilder} */
  thawDelegatedNft(
    input: ThawDelegatedNftBuilderParams,
    options?: TransactionBuilderOptions
  ) {
    return thawDelegatedNftBuilder(this.convergence, input, options);
  }
}
