import { PublicKey } from '@solana/web3.js';

import { VaultParameters, toVaultParams } from '../models';
import { toVaultParamsAccount } from '../accounts';

import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '../../../types';
import { Convergence } from '../../../Convergence';
import { EscrowRfq } from '@/plugins/rfqModule';

const Key = 'FindVaultByAddressOperation' as const;

export const findVaultByAddressOperation =
  useOperation<FindVaultByAddressOperation>(Key);

export type FindVaultByAddressOperation = Operation<
  typeof Key,
  FindVaultByAddressInput,
  FindVaultByAddressOutput
>;

export type FindVaultByAddressInput = {
  /** The address of the Vault. */
  address: PublicKey;
};

export type FindVaultByAddressOutput = {
  vault: VaultParameters;
  rfq: EscrowRfq;
};

/**
 * @group Operations
 * @category Handlers
 */
export const findVaultByAddressOperationHandler: OperationHandler<FindVaultByAddressOperation> =
  {
    handle: async (
      operation: FindVaultByAddressOperation,
      cvg: Convergence,
      scope: OperationScope
    ): Promise<FindVaultByAddressOutput> => {
      const { commitment } = scope;
      const { address } = operation.input;
      scope.throwIfCanceled();

      const account = await cvg.rpc().getAccount(address, commitment);
      const solitaAccount = toVaultParamsAccount(account);
      const rfq = await cvg
        .rfqs()
        .findRfqByAddress({ address: solitaAccount.data.rfq });
      if (rfq.model !== 'escrowRfq') {
        throw new Error('Unexpected rfq type');
      }
      const vault = toVaultParams(solitaAccount, rfq);
      scope.throwIfCanceled();

      return {
        vault,
        rfq,
      };
    },
  };
