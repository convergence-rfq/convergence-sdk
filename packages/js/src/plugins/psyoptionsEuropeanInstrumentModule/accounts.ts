import { EuroMeta } from '@convergence-rfq/psyoptions-european-instrument';
//import { Instrument } from '@convergence-rfq/rfq';
import {
  Account,
  //getAccountParsingAndAssertingFunction,
  //getAccountParsingFunction,
} from '@/types';

/** @group Accounts */
export type PsyoptionsEuropeanInstrumentAccount = Account<EuroMeta>;

/** @group Account Helpers */
//export const parsePsyoptionsEuropeanInstrumentAccount =
//  getAccountParsingFunction(Account);

/** @group Account Helpers */
//export const toPsyoptionsEuropeanInstrumentAccount =
//  getAccountParsingAndAssertingFunction(Instrument);
