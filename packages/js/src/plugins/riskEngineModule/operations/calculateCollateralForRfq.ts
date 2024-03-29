import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '../../../types';
import { Convergence } from '../../../Convergence';
import { LegInstrument } from '../../../plugins/instrumentModule';
import { FixedSize, OrderType } from '../../../plugins/rfqModule';
import { PrintTradeLeg } from '@/plugins/printTradeModule';

const Key = 'CalculateCollateralForRfqOperation' as const;

/**
 * Calculates the required collateral for a taker to create a particular RFQ
 *
 * ```ts
 * await cvg.riskEngine().calculateCollateralForRfq({
      legs,
      quoteAsset,
      size: {
        type: 'fixed',
        amount: 2.1,
      },
      orderType: 'two-way',
      settlementPeriod: 60, // 1 minute
    });
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const calculateCollateralForRfqOperation =
  useOperation<CalculateCollateralForRfqOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type CalculateCollateralForRfqOperation = Operation<
  typeof Key,
  CalculateCollateralForRfqInput,
  CalculateCollateralForRfqOutput
>;

/**
 * @group Operations
 * @category Outputs
 */
export type CalculateCollateralForRfqOutput = {
  /** Collateral required as a floating point number */
  requiredCollateral: number;
};

/**
 * @group Operations
 * @category Inputs
 */
export type CalculateCollateralForRfqInput = {
  /**
   * Size restriction of the RFQ being created.
   */
  size: FixedSize;

  /**
   * Order type of the RFQ being created.
   */
  orderType: OrderType;

  /**
   * Legs of the RFQ being created.
   */
  legs: LegInstrument[] | PrintTradeLeg[];

  /**
   * Settlement period of the RFQ being created in seconds.
   */
  settlementPeriod: number;
};

export type CalculateCollateralForRfqBuilderParams =
  CalculateCollateralForRfqInput;

export const calculateCollateralForRfqOperationHandler: OperationHandler<CalculateCollateralForRfqOperation> =
  {
    handle: async (
      _operation: CalculateCollateralForRfqOperation,
      _convergence: Convergence,
      _scope: OperationScope
    ): Promise<CalculateCollateralForRfqOutput> => {
      return { requiredCollateral: 0 };
    },
  };
