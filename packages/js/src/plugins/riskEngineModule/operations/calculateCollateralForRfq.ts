import {
  AuthoritySide,
  isFixedSizeBaseAsset,
  isFixedSizeNone,
  isFixedSizeQuoteAsset,
  OrderType as SolitaOrderType,
  Side,
} from '@convergence-rfq/rfq';

import { calculateRisk } from '../clientCollateralCalculator';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '../../../types';
import { Convergence } from '../../../Convergence';
import { LegInstrument } from '../../../plugins/instrumentModule';
import { FixedSize, LEG_MULTIPLIER_DECIMALS, toSolitaFixedSize } from "@/plugins/rfqModule";
import { removeDecimals } from "@/utils";

const Key = 'CalculateCollateralForRfqOperation' as const;

/**
 * Calculates the required collateral for a taker to create a particular RFQ
 *
 * ```ts
 * await cvg.riskEngine().calculateCollateralForRfq({
      fixedSize: {
        __kind: 'BaseAsset',
        legsMultiplierBps: 2,
      },
      orderType: OrderType.TwoWay,
      legs,
      settlementPeriod: 5 * 60 * 60, // 5 hours
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
   * Size restriction of the RFQ being created
   */
  fixedSize: FixedSize;
  /**
   * Order type of the RFQ being created
   */
  orderType: SolitaOrderType;
  /**
   * Legs of the RFQ being created
   */
  legs: LegInstrument[];

  /**
   * Settlement period of the RFQ being created in seconds
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
      scope.throwIfCanceled();

      const config = await convergence.riskEngine().fetchConfig(scope);

      const { fixedSize, orderType, legs, settlementPeriod } =
        operation.input;

      const size = toSolitaFixedSize(fixedSize, 0);

      if (isFixedSizeNone(size)) {
        return {
          requiredCollateral: removeDecimals(
            config.collateralForVariableSizeRfqCreation, 
            Number(config.collateralMintDecimals),
          )
        }
      } else if (isFixedSizeQuoteAsset(size)) {
        return {
          requiredCollateral: removeDecimals(
            config.collateralForFixedQuoteAmountRfqCreation, 
            Number(config.collateralMintDecimals),
          )
        }
      } else if (isFixedSizeBaseAsset(size)) {
        const legMultiplier = removeDecimals(size.legsMultiplierBps, LEG_MULTIPLIER_DECIMALS);
        const sideToCase = (side: Side) => {
          return {
            legMultiplier,
            authoritySide: AuthoritySide.Taker,
            quoteSide: side,
          };
        };

        const cases = [];
        if (orderType == SolitaOrderType.Buy) {
          cases.push(sideToCase(Side.Ask));
        } else if (orderType == SolitaOrderType.Sell) {
          cases.push(sideToCase(Side.Bid));
        } else if (orderType == SolitaOrderType.TwoWay) {
          cases.push(sideToCase(Side.Ask));
          cases.push(sideToCase(Side.Bid));
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
        return { requiredCollateral };
      }

      throw new Error('Invalid fixed size');
    },
  };
