import {
  AuthoritySide,
  FixedSize,
  isFixedSizeBaseAsset,
  isFixedSizeNone,
  isFixedSizeQuoteAsset,
  Leg,
  OrderType,
  Side,
} from '@convergence-rfq/rfq';
import { bignum } from '@convergence-rfq/beet';
import { calculateRisk } from '../clientCollateralCalculator';
import { Config } from '../models';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '@/types';
import { Convergence } from '@/Convergence';
//@ts-ignore
import { LEG_MULTIPLIER_DECIMALS } from '@/plugins/rfqModule/constants';

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
  /** Collateral required as a floating point number. */
  requiredCollateral: number;
};

/**
 * @group Operations
 * @category Inputs
 */
export type CalculateCollateralForRfqInput = {
  /**
   * The size restriction of the RFQ being created
   */
  fixedSize: FixedSize;

  /**
   * The order type of the RFQ being created
   */
  orderType: OrderType;
  /**
   * The legs of the RFQ being created
   */
  legs: Leg[];
  /**
   * The settlement period of the RFQ being created in seconds
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

      const { fixedSize, orderType, settlementPeriod } = operation.input;
      let { legs } = operation.input;

      legs.map((leg) => {
        leg.instrumentAmount =
          Number(leg.instrumentAmount) / 10 ** leg.instrumentDecimals;
      });

      if (isFixedSizeNone(fixedSize)) {
        const { requiredCollateral } = convertCollateralBpsToOutput(
          config.collateralForVariableSizeRfqCreation,
          config
        );
        console.log(
          'required collateral for Variable size: ',
          requiredCollateral.toString()
        );
        return convertCollateralBpsToOutput(
          config.collateralForVariableSizeRfqCreation,
          config
        );
      } else if (isFixedSizeQuoteAsset(fixedSize)) {
        const { requiredCollateral } = convertCollateralBpsToOutput(
          config.collateralForFixedQuoteAmountRfqCreation,
          config
        );
        console.log(
          'required collateral for fixed quote asset: ',
          requiredCollateral.toString()
        );
        return convertCollateralBpsToOutput(
          config.collateralForFixedQuoteAmountRfqCreation,
          config
        );
      } else if (isFixedSizeBaseAsset(fixedSize)) {
        const { legsMultiplierBps } = fixedSize;
        const legMultiplier = Number(legsMultiplierBps);

        const sideToCase = (side: Side) => {
          return {
            legMultiplier,
            authoritySide: AuthoritySide.Taker,
            quoteSide: side,
          };
        };

        const cases = [];
        if (orderType == OrderType.Buy) {
          cases.push(sideToCase(Side.Ask));
        } else if (orderType == OrderType.Sell) {
          cases.push(sideToCase(Side.Bid));
        } else if (orderType == OrderType.TwoWay) {
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
        console.log('required collateral for fixed base: ', requiredCollateral.toString());

        return { requiredCollateral };
      }

      throw new Error('Invalid fixed size');
    },
  };

function convertCollateralBpsToOutput(
  value: bignum,
  config: Config
): CalculateCollateralForRfqOutput {
  const requiredCollateral =
    Number(value) / 10 ** Number(config.collateralMintDecimals);

  return { requiredCollateral };
}
