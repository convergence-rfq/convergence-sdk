import { createWithdrawTokensInstruction } from '@convergence-rfq/vault-operator';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';

import { Convergence } from '../../../Convergence';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '../../../types';
import {
  TransactionBuilder,
  TransactionBuilderOptions,
} from '../../../utils/TransactionBuilder';
import { VaultParameters } from '../models';
import { EscrowRfq } from '@/plugins/rfqModule';

const Key = 'WithdrawVaultTokensOperation' as const;

export const withdrawVaultTokensOperation =
  useOperation<WithdrawVaultTokensOperation>(Key);

export type WithdrawVaultTokensOperation = Operation<
  typeof Key,
  WithdrawVaultTokensInput,
  WithdrawVaultTokensOutput
>;

export type WithdrawVaultTokensInput = {
  vault: VaultParameters;
  rfq: EscrowRfq;
};

export type WithdrawVaultTokensOutput = {
  response: SendAndConfirmTransactionResponse;
};

export const withdrawVaultTokensOperationHandler: OperationHandler<WithdrawVaultTokensOperation> =
  {
    handle: async (
      operation: WithdrawVaultTokensOperation,
      cvg: Convergence,
      scope: OperationScope
    ) => {
      const builder = await withdrawVaultTokensBuilder(
        cvg,
        operation.input,
        scope
      );

      const output = await builder.sendAndConfirm(cvg, scope.confirmOptions);

      scope.throwIfCanceled();

      return output;
    },
  };

export type WithdrawVaultTokensBuilderParams = WithdrawVaultTokensInput;

export const withdrawVaultTokensBuilder = async (
  cvg: Convergence,
  params: WithdrawVaultTokensBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<TransactionBuilder> => {
  const { programs, payer = cvg.rpc().getDefaultFeePayer() } = options;
  const { vault, rfq } = params;

  if (!vault.rfq.equals(rfq.address)) {
    throw new Error('RFQ does not match the provided vault');
  }

  const vaultProgram = cvg.programs().getVaultOperator(programs).address;
  const operator = cvg.vaultOperator().pdas().operator(vault.address);

  const legMint = rfq.legs[0].getAssetMint();
  const { quoteMint } = rfq;

  const ix = {
    instruction: createWithdrawTokensInstruction(
      {
        creator: vault.creator,
        vaultParams: vault.address,
        operator,
        legVault: cvg
          .tokens()
          .pdas()
          .associatedTokenAccount({ mint: legMint, owner: operator }),
        legTokens: cvg
          .tokens()
          .pdas()
          .associatedTokenAccount({ mint: legMint, owner: vault.creator }),
        legMint,
        quoteVault: cvg
          .tokens()
          .pdas()
          .associatedTokenAccount({ mint: quoteMint, owner: operator }),
        quoteTokens: cvg
          .tokens()
          .pdas()
          .associatedTokenAccount({ mint: quoteMint, owner: vault.creator }),
        quoteMint,
        response: vault.confirmedResponse,
      },
      vaultProgram
    ),
    signers: [],
    key: 'withdrawVaultTokens',
  };

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .addTxPriorityFeeIx(cvg)
    .add(ix);
};
