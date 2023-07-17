import {
  isFixedSizeBaseAsset,
  isFixedSizeNone,
  isFixedSizeQuoteAsset,
  QuoteSide,
} from '@convergence-rfq/rfq';

import { calculateRisk, CalculationCase } from '../clientCollateralCalculator';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '../../../types';
import { Convergence } from '../../../Convergence';
import {
  LegInstrument,
  QuoteInstrument,
} from '../../../plugins/instrumentModule';
import { removeDecimals } from '../../../utils';
import {
  FixedSize,
  LEG_MULTIPLIER_DECIMALS,
  OrderType,
  toSolitaFixedSize,
} from '../../../plugins/rfqModule';

const Key = 'CalculateCollateralForRfqOperation' as const;

/**
 * Calculates the required collateral for a taker to create a particular RFQ
 *
 * ```ts
 * await cvg.riskEngine().calculateCollateralForRfq({
      legs,
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
  legs: LegInstrument[];

  /**
   * Quote asset of the RFQ being created.
   */
  quoteAsset: QuoteInstrument;

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

      const size = toSolitaFixedSize(fixedSize, 0);
      const config = await convergence.riskEngine().fetchConfig(scope);
      if (isFixedSizeNone(size)) {
        return {
          requiredCollateral: removeDecimals(
            config.minCollateralRequirement,
            Number(config.collateralMintDecimals)
          ),
        };
      } else if (isFixedSizeQuoteAsset(size)) {
        return {
          requiredCollateral: removeDecimals(
            config.collateralForFixedQuoteAmountRfqCreation,
            Number(config.collateralMintDecimals)
          ),
        };
      } else if (isFixedSizeBaseAsset(size)) {
        const legMultiplier = removeDecimals(
          size.legsMultiplierBps,
          LEG_MULTIPLIER_DECIMALS
        );
        const sideToCase = (side: QuoteSide): CalculationCase => {
          return {
            legMultiplier,
            authoritySide: 'taker',
            quoteSide: side,
          };
        };

        const cases: CalculationCase[] = [];
        if (orderType == 'buy') {
          cases.push(sideToCase(QuoteSide.Ask));
        } else if (orderType == 'sell') {
          cases.push(sideToCase(QuoteSide.Bid));
        } else if (orderType == 'two-way') {
          cases.push(sideToCase(QuoteSide.Ask));
          cases.push(sideToCase(QuoteSide.Bid));
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
