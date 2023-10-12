import {
  ProtocolState as SolitaProtocolState,
  Response,
  Rfq,
} from '@convergence-rfq/rfq';

import {
  Account,
  getAccountParsingAndAssertingFunction,
  getAccountParsingFunction,
} from '../../types';

/** @group Accounts */
export type ProtocolStateAccount = Account<SolitaProtocolState>;

/** @group Account Helpers */
export const parseProtocolStateAccount =
  getAccountParsingFunction(SolitaProtocolState);

/** @group Account Helpers */
export const toProtocolStateAccount =
  getAccountParsingAndAssertingFunction(SolitaProtocolState);

/** @group Accounts */
export type ResponseAccount = Account<Response>;

/** @group Account Helpers */
export const parseResponseAccount = getAccountParsingFunction(Response);

/** @group Account Helpers */
export const toResponseAccount =
  getAccountParsingAndAssertingFunction(Response);

/** @group Accounts */
export type RfqAccount = Account<Rfq>;

/** @group Account Helpers */
export const parseRfqAccount = getAccountParsingFunction(Rfq);

/** @group Account Helpers */
export const toRfqAccount = getAccountParsingAndAssertingFunction(Rfq);
