import { PublicKey } from '@solana/web3.js';
import { Confirmation } from '../../rfqModule/models/Confirmation';

import { Convergence } from '@/Convergence';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '@/types';

const Key = 'CalculateCollateralForConfirmationOperation' as const;

/**
 * Calculates the required collateral for a taker for a particular confirmation of the response
 *
 * ```ts
 * await cvg
      .riskEngine()
      .calculateCollateralForConfirmation({
        rfqAddress: rfq.address,
        responseAddress: rfqResponse.address,
        confirmation: {
          side: 'buy',
          overrideLegMultiplier: 3,
        },
      });
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const calculateCollateralForConfirmationOperation =
  useOperation<CalculateCollateralForConfirmationOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type CalculateCollateralForConfirmationOperation = Operation<
  typeof Key,
  CalculateCollateralForConfirmationInput,
  CalculateCollateralForConfirmationOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type CalculateCollateralForConfirmationInput = {
  /** The address of the Rfq account. */
  rfqAddress: PublicKey;

  /** The address of the response account. */
  responseAddress: PublicKey;

  /** Confirmation which collateral requirements are estimated */
  confirmation: Confirmation;
};

/**
 * @group Operations
 * @category Outputs
 */
export type CalculateCollateralForConfirmationOutput = {
  /** Collateral required as a floating point number */
  requiredCollateral: number;
};

export type CalculateCollateralForConfirmationBuilderParams =
  CalculateCollateralForConfirmationInput;

export const calculateCollateralForConfirmationOperationHandler: OperationHandler<CalculateCollateralForConfirmationOperation> =
  {
    handle: async (
      _operation: CalculateCollateralForConfirmationOperation,
      _convergence: Convergence,
      _scope: OperationScope
    ) => {
      return { requiredCollateral: 0 };
    },
  };
