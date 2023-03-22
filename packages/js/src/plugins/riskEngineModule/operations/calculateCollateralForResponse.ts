import { PublicKey } from '@solana/web3.js';
import { AuthoritySide, Quote, Side } from '@convergence-rfq/rfq';

import { calculateRisk } from '../clientCollateralCalculator';
import { extractLegsMultiplierBps } from '../helpers';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '../../../types';
import { Convergence } from '../../../Convergence';
import {
  //@ts-ignore
  ABSOLUTE_PRICE_DECIMALS,
  LEG_MULTIPLIER_DECIMALS,
} from '../../rfqModule/constants';
import { convertResponseInput } from '../../rfqModule';

const Key = 'CalculateCollateralForResponseOperation' as const;

/**
 * Calculates the required collateral for a maker particular response for an RFQ
 *
 * ```ts
 * await cvg.riskEngine().calculateCollateralForResponse({
      rfqAddress: rfq.address,
      bid: {
        __kind: 'Standard',
        priceQuote: {
          __kind: 'AbsolutePrice',
          amountBps: 22_000,
        },
        legsMultiplierBps: 20,
      },
      ask: {
        __kind: 'Standard',
        priceQuote: {
          __kind: 'AbsolutePrice',
          amountBps: 23_000,
        },
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
  /** The address of the Rfq account. */
  rfqAddress: PublicKey;
  /** Bid answer to the Rfq. */
  bid: Quote | null;
  /** Ask answer to the Rfq. */
  ask: Quote | null;
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
      scope.throwIfCanceled();

      const { rfqAddress, bid, ask } = operation.input;

      const [rfq, config] = await Promise.all([
        convergence
          .rfqs()
          .findRfqByAddress({ address: rfqAddress, convert: false }, scope),
        convergence.riskEngine().fetchConfig(scope),
      ]);

      const quoteDecimals = rfq.quoteAsset.instrumentDecimals;

      const { bid: convertedBid, ask: convertedAsk } = convertResponseInput(
        quoteDecimals,
        bid ?? undefined,
        ask ?? undefined
      );

      const getCase = (quote: Quote, side: Side) => {
        const legsMultiplierBps = extractLegsMultiplierBps(rfq, quote);
        const legMultiplier =
          Number(legsMultiplierBps) / 10 ** LEG_MULTIPLIER_DECIMALS;

        return {
          legMultiplier,
          authoritySide: AuthoritySide.Maker,
          quoteSide: side,
        };
      };

      const cases = [];
      if (convertedBid !== undefined) {
        cases.push(getCase(convertedBid, Side.Bid));
      }
      if (convertedAsk !== undefined) {
        cases.push(getCase(convertedAsk, Side.Ask));
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
