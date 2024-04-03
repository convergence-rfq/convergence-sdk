import { PublicKey } from '@solana/web3.js';

import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '../../../types';
import { Convergence } from '../../../Convergence';
import { Quote } from '../../rfqModule';

const Key = 'CalculateCollateralForResponseOperation' as const;

/**
 * Calculates the required collateral for a maker particular response for an RFQ
 *
 * ```ts
 * await cvg.riskEngine().calculateCollateralForResponse({
      rfqAddress: rfq.address,
      bid: {
        price:23_000,
        legsMultiplierBps: 5,
      },
      ask: {
        price:23_000,
        legsMultiplierBps: 5,
      },
    });
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const calculateCollateralForResponseOperation =
  useOperation<CalculateCollateralForResponseOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type CalculateCollateralForResponseOperation = Operation<
  typeof Key,
  CalculateCollateralForResponseInput,
  CalculateCollateralForResponseOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type CalculateCollateralForResponseInput = {
  /** The address of the RFQ account. */
  rfqAddress: PublicKey;

  /** Bid answer to the RFQ. */
  bid?: Quote;

  /** Ask answer to the RFQ. */
  ask?: Quote;
};

/**
 * @group Operations
 * @category Outputs
 */
export type CalculateCollateralForResponseOutput = {
  /** Collateral required as a floating point number */
  requiredCollateral: number;
};

export type CalculateCollateralForResponseBuilderParams =
  CalculateCollateralForResponseInput;

export const calculateCollateralForResponseOperationHandler: OperationHandler<CalculateCollateralForResponseOperation> =
  {
    handle: async (
      _operation: CalculateCollateralForResponseOperation,
      _convergence: Convergence,
      _scope: OperationScope
    ): Promise<CalculateCollateralForResponseOutput> => {
      return { requiredCollateral: 0 };
    },
  };
