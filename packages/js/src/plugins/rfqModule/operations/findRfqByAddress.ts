import { PublicKey } from '@solana/web3.js';
import { Rfq, toRfq } from '../models';
import { toRfqAccount } from '../accounts';
import { convertRfqOutput } from '../helpers';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '@/types';
import { Convergence } from '@/Convergence';

const Key = 'FindRfqByAddressOperation' as const;

/**
 * Finds Rfq by a given address.
 *
 * ```ts
 * const rfq = await convergence
 *   .rfqs()
 *   .findByAddress({ address });
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const findRfqByAddressOperation =
  useOperation<FindRfqByAddressOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type FindRfqByAddressOperation = Operation<
  typeof Key,
  FindRfqByAddressInput,
  FindRfqByAddressOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type FindRfqByAddressInput = {
  /** The address of the Rfq. */
  address: PublicKey;

  /** Optional number of decimals of collateral mint, used for conversion. */
  collateralMintDecimals?: number;

  /** Optional flag for whether to convert the output to a human-readable format. */
  convert?: boolean;
};

/**
 * @group Operations
 * @category Outputs
 */
export type FindRfqByAddressOutput = Rfq;

/**
 * @group Operations
 * @category Handlers
 */
export const findRfqByAddressOperationHandler: OperationHandler<FindRfqByAddressOperation> =
  {
    handle: async (
      operation: FindRfqByAddressOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<FindRfqByAddressOutput> => {
      const { commitment } = scope;
      const { address, convert = true } = operation.input;
      let { collateralMintDecimals } = operation.input;
      scope.throwIfCanceled();

      const account = await convergence.rpc().getAccount(address, commitment);
      const rfq = toRfq(toRfqAccount(account));
      scope.throwIfCanceled();

      if (convert) {
        if (!collateralMintDecimals) {
          const protocol = await convergence.protocol().get();
          collateralMintDecimals = (
            await convergence
              .tokens()
              .findMintByAddress({ address: protocol.collateralMint })
          ).decimals;
        }

        const convertedRfq = convertRfqOutput(rfq, collateralMintDecimals);

        return convertedRfq;
      }

      return rfq;
    },
  };
