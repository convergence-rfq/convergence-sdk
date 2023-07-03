import { PublicKey } from '@solana/web3.js';
import { Quote, AuthoritySide, Side } from '@convergence-rfq/rfq';

import { calculateRisk } from '../clientCollateralCalculator';
import { extractLegsMultiplierBps } from '../helpers';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '../../../types';
import { Convergence } from '../../../Convergence';
import { LEG_MULTIPLIER_DECIMALS } from '../../rfqModule/constants';
import { toSolitaQuote } from '../../rfqModule';

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
      const { rfqAddress, bid = null, ask = null } = operation.input;

      const [rfq, config] = await Promise.all([
        convergence.rfqs().findRfqByAddress({ address: rfqAddress }, scope),
        convergence.riskEngine().fetchConfig(scope),
      ]);

      const solitaBid = toSolitaQuote(bid, rfq.quoteAsset.getDecimals());
      const solitaAsk = toSolitaQuote(ask, rfq.quoteAsset.getDecimals());

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
      if (solitaBid) {
        cases.push(getCase(solitaBid, Side.Bid));
      }
      if (solitaAsk) {
        cases.push(getCase(solitaAsk, Side.Ask));
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
