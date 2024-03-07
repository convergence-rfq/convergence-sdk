import {
  isFixedSizeBaseAsset,
  isFixedSizeOpen,
  isFixedSizeQuoteAsset,
} from '../../rfqModule/models';

import { calculateRisk, CalculationCase } from '../clientCollateralCalculator';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '../../../types';
import { Convergence } from '../../../Convergence';
import { LegInstrument } from '../../../plugins/instrumentModule';
import { removeDecimals } from '../../../utils/conversions';
import { FixedSize, OrderType, ResponseSide } from '../../../plugins/rfqModule';
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
      operation: CalculateCollateralForRfqOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<CalculateCollateralForRfqOutput> => {
      const {
        orderType,
        legs,
        settlementPeriod,
        size: fixedSize,
      } = operation.input;

      const config = await convergence.riskEngine().fetchConfig(scope);
      if (isFixedSizeOpen(fixedSize)) {
        return {
          requiredCollateral: removeDecimals(
            config.minCollateralRequirement,
            Number(config.collateralMintDecimals)
          ),
        };
      } else if (isFixedSizeQuoteAsset(fixedSize)) {
        return {
          requiredCollateral: removeDecimals(
            config.collateralForFixedQuoteAmountRfqCreation,
            Number(config.collateralMintDecimals)
          ),
        };
      } else if (isFixedSizeBaseAsset(fixedSize)) {
        const legsMultiplier = fixedSize.amount;
        const sideToCase = (side: ResponseSide): CalculationCase => {
          return {
            legsMultiplier,
            authoritySide: 'taker',
            quoteSide: side,
          };
        };

        const cases: CalculationCase[] = [];
        if (orderType == 'buy') {
          cases.push(sideToCase('ask'));
        } else if (orderType == 'sell') {
          cases.push(sideToCase('bid'));
        } else if (orderType == 'two-way') {
          cases.push(sideToCase('ask'));
          cases.push(sideToCase('bid'));
        } else {
          throw new Error('Invalid order type');
        }

        const risks = await calculateRisk(
          convergence,
          config,
          legs,
          cases,
          settlementPeriod,
          scope.commitment
        );

        const requiredCollateral = risks.reduce((x, y) => Math.max(x, y), 0);
        return {
          requiredCollateral,
        };
      }

      throw new Error('Invalid fixed size');
    },
  };
