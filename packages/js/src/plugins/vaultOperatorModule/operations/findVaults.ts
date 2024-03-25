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
import { VaultGpaBuilder } from '../gpa';
import { EscrowRfq, toRfq, toRfqAccount } from '@/plugins/rfqModule';

const Key = 'FindVaultsOperation' as const;

export const findVaultsOperation = useOperation<FindVaultsOperation>(Key);

export type FindVaultsOperation = Operation<
  typeof Key,
  FindVaultsInput,
  FindVaultsOutput
>;

export type FindVaultsInput = {
  creator?: PublicKey;
  // Defaults to 100
  chunkSize?: number;
};

export type FindVaultsOutput = {
  vault: VaultParameters;
  rfq: EscrowRfq;
}[];

/**
 * @group Operations
 * @category Handlers
 */
export const findVaultsOperationHandler: OperationHandler<FindVaultsOperation> =
  {
    async handle(
      operation: FindVaultsOperation,
      cvg: Convergence,
      scope: OperationScope
    ) {
      const { commitment } = scope;
      const { creator, chunkSize = 100 } = operation.input;

      scope.throwIfCanceled();

      const rfqGpaBuilder = new VaultGpaBuilder(cvg)
        .whereTokensWithdrawn(false)
        .withoutData();
      if (creator !== undefined) {
        rfqGpaBuilder.whereCreator(creator);
      }

      const unparsedAccounts = await rfqGpaBuilder.get();
      const unparsedAddresses = unparsedAccounts.map(
        (account) => account.publicKey
      );

      const result = [];

      for (let i = 0; i < unparsedAddresses.length; i += chunkSize) {
        const chunk = unparsedAddresses.slice(i, i + chunkSize);

        const vaultRawAccounts = await cvg
          .rpc()
          .getMultipleAccounts(chunk, commitment);
        const vaultSolitaAccounts = await Promise.all(
          vaultRawAccounts.map((account) => toVaultParamsAccount(account))
        );
        const rfqAddresses = vaultSolitaAccounts.map(
          (account) => account.data.rfq
        );
        const rfqRawAccounts = await cvg
          .rpc()
          .getMultipleAccounts(rfqAddresses, commitment);
        const rfqs = await Promise.all(
          rfqRawAccounts.map((account) => toRfq(cvg, toRfqAccount(account)))
        );

        const vaultRfqPairs = vaultSolitaAccounts.map((solVault, index) => {
          const rfq = rfqs[index];
          if (rfq.model !== 'escrowRfq') {
            throw new Error('Unexpected rfq type');
          }

          const vault = toVaultParams(solVault, rfq);
          return { vault, rfq };
        });

        result.push(...vaultRfqPairs);
      }

      return result;
    },
  };
