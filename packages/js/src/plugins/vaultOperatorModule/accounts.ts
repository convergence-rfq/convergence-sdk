import { VaultParams } from '@convergence-rfq/vault-operator';

import {
  Account,
  getAccountParsingAndAssertingFunction,
  getAccountParsingFunction,
} from '../../types';

/** @group Accounts */
export type VaultParamsAccount = Account<VaultParams>;

/** @group Account Helpers */
export const parseVaultParamsAccount = getAccountParsingFunction(VaultParams);

/** @group Account Helpers */
export const toVaultParamsAccount =
  getAccountParsingAndAssertingFunction(VaultParams);
