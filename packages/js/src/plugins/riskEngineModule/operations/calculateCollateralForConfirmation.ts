import { createCalculateCollateralForConfirmationInstruction } from '@convergence-rfq/risk-engine';
import { PublicKey, AccountMeta } from '@solana/web3.js';
import { BaseAssetIndex } from '@convergence-rfq/rfq';
import { RiskEnginePdasClient } from '../RiskEnginePdasClient';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { ProtocolPdasClient } from '@/plugins/protocolModule';

import { Convergence } from '@/Convergence';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '@/types';

import { TransactionBuilder, TransactionBuilderOptions } from '@/utils';

const Key = 'CalculateCollateralForConfirmationOperation' as const;

export const calculateCollateralForConfirmationOperation =
  useOperation<CalculateCollateralForConfirmationOperation>(Key);

export type CalculateCollateralForConfirmationOperation = Operation<
  typeof Key,
  CalculateCollateralForConfirmationIntput,
  CalculateCollateralForConfirmationOutput
>;

export type CalculateCollateralForConfirmationOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

export type CalculateCollateralForConfirmationIntput = {
  /** The address of the Rfq account. */
  rfq: PublicKey;
  /** The address of the response account. */
  response: PublicKey;
  /** the base asset index */
  baseAssetIndex?: BaseAssetIndex;
};

export type CalculateCollateralForConfirmationBuilderParams =
  CalculateCollateralForConfirmationIntput;

export const calculateCollateralForConfirmationOperationHandler: OperationHandler<CalculateCollateralForConfirmationOperation> =
  {
    handle: async (
      operation: CalculateCollateralForConfirmationOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<CalculateCollateralForConfirmationOutput> => {
      scope.throwIfCanceled();

      return calculateCollateralForConfirmationbuilder(
        convergence,
        operation.input,
        scope
      ).sendAndConfirm(convergence, scope.confirmOptions);
    },
  };

export const calculateCollateralForConfirmationbuilder = (
  convergence: Convergence,
  params: CalculateCollateralForConfirmationBuilderParams,
  options: TransactionBuilderOptions = {}
): TransactionBuilder => {
  const anchorRemainingAccounts: AccountMeta[] = [];
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;

  const { rfq, response, baseAssetIndex = { value: 0 } } = params;
  const riskEngineProgram = convergence.programs().getRiskEngine(programs);

  const config = new RiskEnginePdasClient(convergence).config();

  const SWITCHBOARD_BTC_ORACLE = new PublicKey(
    '8SXvChNYFhRq4EZuZvnhjrB3jJRQCv4k3P4W6hesH3Ee'
  );

  const baseAsset = new ProtocolPdasClient(convergence).baseAsset({
    index: baseAssetIndex,
  });
  const baseAssetAccounts: AccountMeta[] = [
    {
      pubkey: baseAsset,
      isSigner: false,
      isWritable: false,
    },
  ];
  const oracleAccounts: AccountMeta[] = [
    {
      pubkey: SWITCHBOARD_BTC_ORACLE,
      isSigner: false,
      isWritable: false,
    },
  ];

  anchorRemainingAccounts.push(...baseAssetAccounts, ...oracleAccounts);

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .add({
      instruction: createCalculateCollateralForConfirmationInstruction(
        {
          rfq,
          response,
          config,
          anchorRemainingAccounts,
        },

        riskEngineProgram.address
      ),
      signers: [],
      key: 'CalculateCollateralForConfirmationOperation',
    });
};
