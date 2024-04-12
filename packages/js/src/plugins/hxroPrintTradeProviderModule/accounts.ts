import { Config } from '@convergence-rfq/hxro-print-trade-provider';

import {
  Account,
  getAccountParsingAndAssertingFunction,
  getAccountParsingFunction,
} from '../../types';

/** @group Accounts */
export type HxroPrintTradeProviderConfigAccount = Account<Config>;

/** @group Account Helpers */
export const parseHxroPrintTradeProviderConfigAccount =
  getAccountParsingFunction(Config);

/** @group Account Helpers */
export const toHxroPrintTradeProviderConfigAccount =
  getAccountParsingAndAssertingFunction(Config);
