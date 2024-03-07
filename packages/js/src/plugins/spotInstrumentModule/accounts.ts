import { Config } from '@convergence-rfq/spot-instrument';

import {
  Account,
  getAccountParsingAndAssertingFunction,
  getAccountParsingFunction,
} from '../../types';

/** @group Accounts */
export type SpotInstrumentConfigAccount = Account<Config>;

/** @group Account Helpers */
export const parseSpotInstrumentConfigAccount =
  getAccountParsingFunction(Config);

/** @group Account Helpers */
export const toSpotInstrumentConfigAccount =
  getAccountParsingAndAssertingFunction(Config);
