import {
  CollateralInfo,
  ProtocolState,
  Response,
  Rfq,
} from '@convergence-rfq/rfq';
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

/** @group Accounts */
export type ProtocolState = Account<ProtocolState>;

/** @group Account Helpers */
export const parseProtocolStateAccount =
  getAccountParsingFunction(ProtocolState);

/** @group Account Helpers */
export const toProtocolStateAccount =
  getAccountParsingAndAssertingFunction(ProtocolState);

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
