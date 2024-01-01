import { PublicKey } from '@solana/web3.js';

import { CalculationCase, calculateRisk } from '../clientCollateralCalculator';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '../../../types';
import { Convergence } from '../../../Convergence';
import { Quote, ResponseSide } from '../../rfqModule';
import { extractLegsMultiplier } from '@/plugins/rfqModule/helpers';

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
      operation: CalculateCollateralForResponseOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<CalculateCollateralForResponseOutput> => {
      const { rfqAddress, bid, ask } = operation.input;

      const [rfq, config] = await Promise.all([
        convergence.rfqs().findRfqByAddress({ address: rfqAddress }, scope),
        convergence.riskEngine().fetchConfig(scope),
      ]);

      const getCase = (quote: Quote, side: ResponseSide): CalculationCase => {
        const legsMultiplier = extractLegsMultiplier(rfq, quote);
        return {
          legsMultiplier,
          authoritySide: 'maker',
          quoteSide: side,
        };
      };

      const cases: CalculationCase[] = [];
      if (bid) {
        cases.push(getCase(bid, 'bid'));
      }
      if (ask) {
        cases.push(getCase(ask, 'ask'));
      }

      const risks = await calculateRisk(
        convergence,
        config,
        rfq.legs,
        cases,
        rfq.settlingWindow,
        scope.commitment
      );
      const requiredCollateral = risks.reduce((x, y) => Math.max(x, y), 0);

      return { requiredCollateral };
    },
  };
