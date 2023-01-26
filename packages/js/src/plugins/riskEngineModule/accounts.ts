import { Config } from '@convergence-rfq/risk-engine';
import {
  Account,
  getAccountParsingAndAssertingFunction,
  getAccountParsingFunction,
} from '@/types';

/** @group Accounts */
export type ConfigAccount = Account<Config>;

/** @group Account Helpers */
export const parseConfigAccount = getAccountParsingFunction(Config);

/** @group Account Helpers */
export const toConfigAccount = getAccountParsingAndAssertingFunction(Config);
