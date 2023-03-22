import { ProtocolState, BaseAssetInfo, MintInfo } from '@convergence-rfq/rfq';

import {
  Account,
  getAccountParsingAndAssertingFunction,
  getAccountParsingFunction,
} from '../../types';

/** @group Accounts */
export type ProtocolAccount = Account<ProtocolState>;

/** @group Account Helpers */
export const parseProtocolAccount = getAccountParsingFunction(ProtocolState);

/** @group Account Helpers */
export const toProtocolAccount =
  getAccountParsingAndAssertingFunction(ProtocolState);

/** @group Accounts */
export type BaseAssetAccount = Account<BaseAssetInfo>;

/** @group Account Helpers */
export const parseBaseAssetAccount = getAccountParsingFunction(BaseAssetInfo);

/** @group Account Helpers */
export const toBaseAssetAccount =
  getAccountParsingAndAssertingFunction(BaseAssetInfo);

/** @group Accounts */
export type RegisteredMintAccount = Account<MintInfo>;

/** @group Account Helpers */
export const parseRegisteredMintAccount = getAccountParsingFunction(MintInfo);

/** @group Account Helpers */
export const toRegisteredMintAccount =
  getAccountParsingAndAssertingFunction(MintInfo);
