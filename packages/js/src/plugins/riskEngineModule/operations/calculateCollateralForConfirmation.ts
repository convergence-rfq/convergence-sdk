import { PublicKey } from '@solana/web3.js';
import { QuoteSide } from '@convergence-rfq/rfq';
import { Confirmation } from '../../rfqModule/models/Confirmation';

import { CalculationCase, calculateRisk } from '../clientCollateralCalculator';
import { extractLegsMultiplier } from '../helpers';
import { Convergence } from '../../../Convergence';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '../../../types';
import { toSolitaQuote } from '@/plugins/rfqModule';

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
          side: Side.Bid,
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
      operation: CalculateCollateralForConfirmationOperation,
      convergence: Convergence,
      scope: OperationScope
    ) => {
      scope.throwIfCanceled();

      const { rfqAddress, responseAddress, confirmation } = operation.input;

      // fetching in parallel
      const [rfq, response, config] = await Promise.all([
        convergence.rfqs().findRfqByAddress({ address: rfqAddress }, scope),
        convergence
          .rfqs()
          .findResponseByAddress({ address: responseAddress }, scope),
        convergence.riskEngine().fetchConfig(scope),
      ]);

      //TODO getSettlementResult logic can be used here to get confirmed
      let legsMultiplier: number;
      if (confirmation.overrideLegMultiplier) {
        legsMultiplier = confirmation.overrideLegMultiplier;
      } else {
        const confirmedQuote =
          confirmation.side == QuoteSide.Bid ? response.bid : response.ask;

        if (confirmedQuote === null) {
          throw Error('Cannot confirm a missing quote!');
        }

        legsMultiplier = extractLegsMultiplier(
          rfq,
          toSolitaQuote(confirmedQuote, rfq.quoteAsset.getDecimals())
        );
      }

      const calculationCase: CalculationCase = {
        legsMultiplier,
        authoritySide: 'taker',
        quoteSide: confirmation.side,
      };

      const [requiredCollateral] = await calculateRisk(
        convergence,
        config,
        rfq.legs,
        [calculationCase],
        rfq.settlingWindow,
        scope.commitment
      );

      return { requiredCollateral };
    },
  };
