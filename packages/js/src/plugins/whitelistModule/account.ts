import { Whitelist as SolitaWhitelist } from '@convergence-rfq/rfq';

import {
  Account,
  getAccountParsingAndAssertingFunction,
  getAccountParsingFunction,
} from '../../types';

/** @group Accounts */
export type WhitelistAccount = Account<SolitaWhitelist>;

// TODO: Categorize bugs and what caused them, how to mitigate in future? Paywrite

/** @group Account Helpers */
export const parseWhitelistAccount = getAccountParsingFunction(SolitaWhitelist);

/** @group Account Helpers */
export const toWhitelistAccount =
  getAccountParsingAndAssertingFunction(SolitaWhitelist);
