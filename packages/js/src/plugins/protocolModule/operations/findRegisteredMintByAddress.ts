import { PublicKey } from '@solana/web3.js';
import { toRegisteredMintAccount } from '../accounts';
import { RegisteredMint, toRegisteredMint } from '../models/RegisteredMint';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '@/types';
import { Convergence } from '@/Convergence';

const Key = 'FindRegisteredMintByAddressOperation' as const;

/**
 * Finds RegisteredMint by a given address.
 *
 * ```ts
 * const rfq = await convergence
 *   .rfqs()
 *   .findRegisteredMintByAddress({ address };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const findRegisteredMintByAddressOperation =
  useOperation<FindRegisteredMintByAddressOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type FindRegisteredMintByAddressOperation = Operation<
  typeof Key,
  FindRegisteredMintByAddressInput,
  FindRegisteredMintByAddressOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type FindRegisteredMintByAddressInput = {
  /** The address of the RegisteredMint. */
  address: PublicKey;
};

/**
 * @group Operations
 * @category Outputs
 */
export type FindRegisteredMintByAddressOutput = RegisteredMint;

/**
 * @group Operations
 * @category Handlers
 */
export const findRegisteredMintByAddressOperationHandler: OperationHandler<FindRegisteredMintByAddressOperation> =
  {
    handle: async (
      operation: FindRegisteredMintByAddressOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<FindRegisteredMintByAddressOutput> => {
      const { commitment } = scope;
      const { address } = operation.input;
      scope.throwIfCanceled();

      const account = await convergence.rpc().getAccount(address, commitment);
      const registeredMint = toRegisteredMint(toRegisteredMintAccount(account));
      scope.throwIfCanceled();

      return registeredMint;
    },
  };
