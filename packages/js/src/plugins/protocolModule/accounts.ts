import { ProtocolState } from '@convergence-rfq/rfq';
import {
  Account,
  getAccountParsingAndAssertingFunction,
  getAccountParsingFunction,
} from '@/types';

/** @group Accounts */
export type ProtocolAccount = Account<ProtocolState>;

/** @group Account Helpers */
export const parseProtocolAccount = getAccountParsingFunction(ProtocolState);

/** @group Account Helpers */
export const toProtocolAccount =
  getAccountParsingAndAssertingFunction(ProtocolState);
