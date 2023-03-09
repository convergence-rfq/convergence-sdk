import { PublicKey } from '@solana/web3.js';
import { Collateral, toCollateral } from '../models';
import { toCollateralAccount } from '../accounts';
import { toRegisteredMint } from '@/plugins/protocolModule';
import { toRegisteredMintAccount } from '@/plugins/protocolModule/accounts';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '@/types';
import { Convergence } from '@/Convergence';

const Key = 'FindCollateralByAddressOperation' as const;

/**
 * Finds Collateral by a given address.
 *
 * ```ts
 * const collateral = await convergence
 *   .collateral()
 *   .findByAddress({ address: user.publicKey });
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const findCollateralByAddressOperation =
  useOperation<FindCollateralByAddressOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type FindCollateralByAddressOperation = Operation<
  typeof Key,
  FindCollateralByAddressInput,
  FindCollateralByAddressOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type FindCollateralByAddressInput = {
  /** The address of the Collateral account. */
  address: PublicKey;
};

/**
 * @group Operations
 * @category Outputs
 */
export type FindCollateralByAddressOutput = Collateral;

/**
 * @group Operations
 * @category Handlers
 */
export const findCollateralByAddressOperationHandler: OperationHandler<FindCollateralByAddressOperation> =
  {
    handle: async (
      operation: FindCollateralByAddressOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<FindCollateralByAddressOutput> => {
      const { commitment } = scope;
      const { address } = operation.input;
      scope.throwIfCanceled();

      const account = await convergence.rpc().getAccount(address, commitment);
      const collateralModel = toCollateral(toCollateralAccount(account));
      scope.throwIfCanceled();

      const protocol = await convergence.protocol().get();
      // const collateralMint = await convergence
      //   .protocol()
      //   .findRegisteredMintByAddress({ address: protocol.collateralMint });
      //@ts-ignore
      const collateralMint = await convergence
        .tokens()
        .findMintByAddress({ address: protocol.collateralMint });

      const mintInfo = convergence
        .rfqs()
        .pdas()
        .mintInfo({ mint: protocol.collateralMint });
      const acct = await convergence.rpc().getAccount(mintInfo);
      const registeredMint = toRegisteredMint(toRegisteredMintAccount(acct));

      collateralModel.lockedTokensAmount /= Math.pow(
        10,
        // collateralMint.decimals
        registeredMint.decimals
      );

      return collateralModel;
    },
  };
