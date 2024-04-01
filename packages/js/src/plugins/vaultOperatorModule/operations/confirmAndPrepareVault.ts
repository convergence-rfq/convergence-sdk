import {
  createConfirmResponseInstruction,
  createPrepareSettlementInstruction,
} from '@convergence-rfq/vault-operator';
import { PublicKey } from '@solana/web3.js';
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
import {
  EscrowResponse,
  EscrowRfq,
  getEscrowPrepareSettlementRemainingAccounts,
} from '@/plugins/rfqModule';

const Key = 'ConfirmAndPrepareVaultOperation' as const;

export const confirmAndPrepareVaultOperation =
  useOperation<ConfirmAndPrepareVaultOperation>(Key);

export type ConfirmAndPrepareVaultOperation = Operation<
  typeof Key,
  ConfirmAndPrepareVaultInput,
  ConfirmAndPrepareVaultOutput
>;

export type ConfirmAndPrepareVaultInput = {
  vault: VaultParameters;
  rfq: EscrowRfq;
  response: EscrowResponse;
};

export type ConfirmAndPrepareVaultOutput = {
  response: SendAndConfirmTransactionResponse;
  vault: VaultParameters;
};

export const confirmAndPrepareVaultOperationHandler: OperationHandler<ConfirmAndPrepareVaultOperation> =
  {
    handle: async (
      operation: ConfirmAndPrepareVaultOperation,
      cvg: Convergence,
      scope: OperationScope
    ) => {
      const { builder, vault } = await confirmAndPrepareVaultBuilder(
        cvg,
        operation.input,
        scope
      );

      const output = await builder.sendAndConfirm(cvg, scope.confirmOptions);

      scope.throwIfCanceled();

      return { ...output, vault };
    },
  };

export type ConfirmAndPrepareVaultBuilderParams = ConfirmAndPrepareVaultInput;

export type ConfirmAndPrepareVaultResult = {
  builder: TransactionBuilder;
  vault: VaultParameters;
};

export const confirmAndPrepareVaultBuilder = async (
  cvg: Convergence,
  params: ConfirmAndPrepareVaultBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<ConfirmAndPrepareVaultResult> => {
  const { programs, payer = cvg.rpc().getDefaultFeePayer() } = options;
  const { vault, rfq, response } = params;

  if (!vault.rfq.equals(rfq.address)) {
    throw new Error('RFQ does not match the provided vault');
  }
  if (!response.rfq.equals(rfq.address)) {
    throw new Error('RFQ does not match the provided response');
  }
  if (!vault.confirmedResponse.equals(PublicKey.default)) {
    throw new Error('Another response is already confirmed for this vault');
  }

  const vaultProgram = cvg.programs().getVaultOperator(programs).address;
  const operator = cvg.vaultOperator().pdas().operator(vault.address);

  const confirmIx = {
    instruction: createConfirmResponseInstruction(
      {
        vaultParams: vault.address,
        operator,
        protocol: cvg.protocol().pdas().protocol(),
        rfq: rfq.address,
        response: response.address,
        collateralInfo: cvg.collateral().pdas().collateralInfo({
          user: operator,
        }),
        makerCollateralInfo: cvg.collateral().pdas().collateralInfo({
          user: response.maker,
        }),
        collateralToken: cvg.collateral().pdas().collateralToken({
          user: operator,
        }),
        riskEngine: cvg.programs().getRiskEngine(programs).address,
        rfqProgram: cvg.programs().getRfq(programs).address,
      },
      vaultProgram
    ),
    signers: [],
    key: 'confirmVault',
  };

  const {
    anchorRemainingAccounts: prepareRemainingAccounts,
    ataTxBuilderArray,
  } = await getEscrowPrepareSettlementRemainingAccounts(
    cvg,
    operator,
    rfq,
    response,
    1
  );
  if (ataTxBuilderArray.length > 0) {
    throw new Error(
      'Vault ata accounts for the settlement should be pre-created!'
    );
  }

  const prepareIx = {
    instruction: createPrepareSettlementInstruction(
      {
        vaultParams: vault.address,
        operator,
        protocol: cvg.protocol().pdas().protocol(),
        rfq: rfq.address,
        response: response.address,
        rfqProgram: cvg.programs().getRfq(programs).address,
        anchorRemainingAccounts: prepareRemainingAccounts,
      },
      vaultProgram
    ),
    signers: [],
    key: 'prepareVaultSettlement',
  };

  const builder = TransactionBuilder.make()
    .setFeePayer(payer)
    .addTxPriorityFeeIx(cvg)
    .add(confirmIx, prepareIx);

  return {
    builder,
    vault: {
      ...vault,
      confirmedResponse: response.address,
    },
  };
};
