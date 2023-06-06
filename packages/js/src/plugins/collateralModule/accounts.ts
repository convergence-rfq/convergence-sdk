import { CollateralInfo as SolitaCollateralInfo } from '@convergence-rfq/rfq';

import {
  Account,
  getAccountParsingAndAssertingFunction,
  getAccountParsingFunction,
} from '../../types';

/** @group Accounts */
export type CollateralAccount = Account<SolitaCollateralInfo>;

// TODO: Categorize bugs and what caused them, how to mitigate in future? Paywrite

/** @group Account Helpers */
export const parseCollateralAccount =
  getAccountParsingFunction(SolitaCollateralInfo);

/** @group Account Helpers */
export const toCollateralAccount =
  getAccountParsingAndAssertingFunction(SolitaCollateralInfo);
