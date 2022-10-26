import {
  approveTokenDelegateAuthorityBuilder,
  ApproveTokenDelegateAuthorityBuilderParams,
  createMintBuilder,
  CreateMintBuilderParams,
  createTokenBuilder,
  CreateTokenBuilderParams,
  createTokenIfMissingBuilder,
  CreateTokenIfMissingBuilderParams,
  createTokenWithMintBuilder,
  CreateTokenWithMintBuilderParams,
  freezeTokensBuilder,
  FreezeTokensBuilderParams,
  mintTokensBuilder,
  MintTokensBuilderParams,
  revokeTokenDelegateAuthorityBuilder,
  RevokeTokenDelegateAuthorityBuilderParams,
  sendTokensBuilder,
  SendTokensBuilderParams,
  thawTokensBuilder,
  ThawTokensBuilderParams,
} from './operations';
import type { Convergence } from '@/Convergence';
import { TransactionBuilderOptions } from '@/utils';

/**
 * This client allows you to access the underlying Transaction Builders
 * for the write operations of the Token module.
 *
 * @see {@link TokenClient}
 * @group Module Builders
 * */
export class TokenBuildersClient {
  constructor(protected readonly convergence: Convergence) {}

  // -----------------
  // Create
  // -----------------

  /** {@inheritDoc createMintBuilder} */
  createMint(
    input: CreateMintBuilderParams,
    options?: TransactionBuilderOptions
  ) {
    return createMintBuilder(this.convergence, input, options);
  }

  /** {@inheritDoc createTokenBuilder} */
  createToken(
    input: CreateTokenBuilderParams,
    options?: TransactionBuilderOptions
  ) {
    return createTokenBuilder(this.convergence, input, options);
  }

  /** {@inheritDoc createTokenIfMissingBuilder} @internal */
  createTokenIfMissing(
    input: CreateTokenIfMissingBuilderParams,
    options?: TransactionBuilderOptions
  ) {
    return createTokenIfMissingBuilder(this.convergence, input, options);
  }

  /** {@inheritDoc createTokenWithMintBuilder} */
  createTokenWithMint(
    input: CreateTokenWithMintBuilderParams,
    options?: TransactionBuilderOptions
  ) {
    return createTokenWithMintBuilder(this.convergence, input, options);
  }

  // -----------------
  // Update
  // -----------------

  /** {@inheritDoc mintTokensBuilder} */
  mint(input: MintTokensBuilderParams, options?: TransactionBuilderOptions) {
    return mintTokensBuilder(this.convergence, input, options);
  }

  /** {@inheritDoc sendTokensBuilder} */
  send(input: SendTokensBuilderParams, options?: TransactionBuilderOptions) {
    return sendTokensBuilder(this.convergence, input, options);
  }

  /** {@inheritDoc freezeTokensBuilder} */
  freeze(
    input: FreezeTokensBuilderParams,
    options?: TransactionBuilderOptions
  ) {
    return freezeTokensBuilder(this.convergence, input, options);
  }

  /** {@inheritDoc thawTokensBuilder} */
  thaw(input: ThawTokensBuilderParams, options?: TransactionBuilderOptions) {
    return thawTokensBuilder(this.convergence, input, options);
  }

  // -----------------
  // Delegate
  // -----------------

  /** {@inheritDoc approveTokenDelegateAuthorityBuilder} */
  approveDelegateAuthority(
    input: ApproveTokenDelegateAuthorityBuilderParams,
    options?: TransactionBuilderOptions
  ) {
    return approveTokenDelegateAuthorityBuilder(
      this.convergence,
      input,
      options
    );
  }

  /** {@inheritDoc revokeTokenDelegateAuthorityBuilder} */
  revokeDelegateAuthority(
    input: RevokeTokenDelegateAuthorityBuilderParams,
    options?: TransactionBuilderOptions
  ) {
    return revokeTokenDelegateAuthorityBuilder(
      this.convergence,
      input,
      options
    );
  }
}
