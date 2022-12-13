import { CollateralInfo } from '@convergence-rfq/rfq';
import {
  Account,
  getAccountParsingAndAssertingFunction,
  getAccountParsingFunction,
} from '@/types';

/** @group Accounts */
export type CollateralAccount = Account<CollateralInfo>;

/** @group Account Helpers */
export const parseCollateralAccount = getAccountParsingFunction(CollateralInfo);

/** @group Account Helpers */
export const toCollateralAccount =
  getAccountParsingAndAssertingFunction(CollateralInfo);
