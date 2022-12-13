import { CollateralInfo } from '@convergence-rfq/rfq';
import {
  Account,
  getAccountParsingAndAssertingFunction,
  getAccountParsingFunction,
} from '@/types';

/** @group Accounts */
export type CollateralInfoAccount = Account<CollateralInfo>;

/** @group Account Helpers */
export const parseCollateralInfoAccount =
  getAccountParsingFunction(CollateralInfo);

/** @group Account Helpers */
export const toCollateralInfoAccount =
  getAccountParsingAndAssertingFunction(CollateralInfo);
