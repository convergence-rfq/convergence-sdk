import { PublicKey } from '@solana/web3.js';
import {
  toMint,
  toMintAccount,
  toToken,
  toTokenAccount,
} from '../../tokenModule';
import { toRfqAccount } from '../accounts';
import {
  JsonMetadata,
  Rfq,
  toRfq,
  toMetadata,
  toRfqWithToken,
} from '../models';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '@/types';
import { Convergence } from '@/Convergence';

const Key = 'FindRfqByMintOperation' as const;

/**
 * Finds an RFQ by its mint address.
 *
 * ```ts
 * const rfq = await convergence
 *   .rfqs()
 *   .findByMint({ mintAddress };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const findRfqByMintOperation = useOperation<FindRfqByMintOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type FindRfqByMintOperation = Operation<
  typeof Key,
  FindRfqByMintInput,
  FindRfqByMintOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type FindRfqByMintInput = {
  /** The address of the mint account. */
  mintAddress: PublicKey;

  /**
   * The explicit token account to fetch with the Rfq or SFT.
   *
   * If provided, and if that address is valid, the Rfq or SFT returned
   * will be of the type `RfqWithToken` or `SftWithToken` respectively.
   *
   * Alternatively, you may use the `tokenOwner` parameter to fetch the
   * associated token account.
   *
   * @defaultValue Defaults to not fetching the token account.
   */
  tokenAddress?: PublicKey;

  /**
   * The associated token account to fetch with the Rfq or SFT.
   *
   * If provided, and if that account exists, the Rfq or SFT returned
   * will be of the type `RfqWithToken` or `SftWithToken` respectively.
   *
   * Alternatively, you may use the `tokenAddress` parameter to fetch the
   * token account at an explicit address.
   *
   * @defaultValue Defaults to not fetching the associated token account.
   */
  tokenOwner?: PublicKey;

  /**
   * Whether or not we should fetch the JSON Metadata for the Rfq or SFT.
   *
   * @defaultValue `true`
   */
  loadJsonMetadata?: boolean;
};

/**
 * @group Operations
 * @category Outputs
 */
export type FindRfqByMintOutput = Rfq;

/**
 * @group Operations
 * @category Handlers
 */
export const findRfqByMintOperationHandler: OperationHandler<FindRfqByMintOperation> =
  {
    handle: async (
      operation: FindRfqByMintOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<FindRfqByMintOutput> => {
      const { programs, commitment } = scope;
      const {
        mintAddress,
        tokenAddress,
        tokenOwner,
        loadJsonMetadata = true,
      } = operation.input;

      const associatedTokenAddress = tokenOwner
        ? convergence.tokens().pdas().associatedTokenAccount({
            mint: mintAddress,
            owner: tokenOwner,
            programs,
          })
        : undefined;
      const rfqPdas = convergence.rfqs().pdas();
      const accountAddresses = [
        mintAddress,
        rfqPdas.metadata({ mint: mintAddress, programs }),
        rfqPdas.masterEdition({ mint: mintAddress, programs }),
        tokenAddress ?? associatedTokenAddress,
      ].filter((address): address is PublicKey => !!address);

      const accounts = await convergence
        .rpc()
        .getMultipleAccounts(accountAddresses, commitment);
      scope.throwIfCanceled();

      const mint = toMint(toMintAccount(accounts[0]));
      let metadata = toMetadata(toRfqAccount(accounts[1]));
      const token = accounts[3] ? toToken(toTokenAccount(accounts[3])) : null;

      if (loadJsonMetadata) {
        try {
          const json = await convergence
            .storage()
            .downloadJson<JsonMetadata>(metadata.uri, scope);
          metadata = { ...metadata, jsonLoaded: true, json };
        } catch (error) {
          metadata = { ...metadata, jsonLoaded: true, json: null };
        }
      }

      return token
        ? toRfqWithToken(metadata, mint, token)
        : toRfq(metadata, mint);
    },
  };
