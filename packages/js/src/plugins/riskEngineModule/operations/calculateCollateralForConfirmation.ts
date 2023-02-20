import { PublicKey } from '@solana/web3.js';
import { AuthoritySide, Confirmation, Side } from '@convergence-rfq/rfq';

import { calculateRisk } from '../clientCollateralCalculator';
import { extractLegsMultiplierBps } from '../helpers';
import { Convergence } from '@/Convergence';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '@/types';
import { ABSOLUTE_PRICE_DECIMALS } from '@/plugins/rfqModule/constants';

const Key = 'CalculateCollateralForConfirmationOperation' as const;

/**
 * Calculates the required collateral for a taker for a particular confirmation of the response
 *
 * ```ts
 * TODO
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

      let legMultiplierBps;
      if (confirmation.overrideLegMultiplierBps === null) {
        const confirmedQuote =
          confirmation.side == Side.Bid ? response.bid : response.ask;

        if (confirmedQuote === null) {
          throw Error('Cannot confirm a missing quote!');
        }

        legMultiplierBps = extractLegsMultiplierBps(rfq, confirmedQuote);
      } else {
        legMultiplierBps = confirmation.overrideLegMultiplierBps;
      }
      const legMultiplier =
        Number(legMultiplierBps) / 10 ** ABSOLUTE_PRICE_DECIMALS;

      const calculationCase = {
        legMultiplier,
        authoritySide: AuthoritySide.Taker,
        quoteSide: confirmation.side,
      };

      let [requiredCollateral] = await calculateRisk(
        convergence,
        config,
        rfq.legs,
        [calculationCase],
        rfq.settlingWindow,
        scope.commitment
      );

      requiredCollateral *= Math.pow(10, ABSOLUTE_PRICE_DECIMALS);

      return { requiredCollateral };
    },
  };
