import { createCalculateCollateralForResponseInstruction } from '@convergence-rfq/risk-engine';
import { PublicKey, AccountMeta } from '@solana/web3.js';
import { BaseAssetIndex } from '@convergence-rfq/rfq';
import { bignum } from '@convergence-rfq/beet';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { RiskEnginePdasClient } from '../RiskEnginePdasClient';
import { Convergence } from '@/Convergence';
import { ProtocolPdasClient } from '@/plugins/protocolModule';

import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '@/types';
import { TransactionBuilder, TransactionBuilderOptions } from '@/utils';

const Key = 'CalculateCollateralForResponseOperation' as const;

export const calculateCollateralForResponseOperation =
  useOperation<CalculateCollateralForResponseOperation>(Key);

export type CalculateCollateralForResponseOperation = Operation<
  typeof Key,
  CalculateCollateralForResponseIntput,
  CalculateCollateralForResponseOutput
>;

export type CalculateCollateralForResponseOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
  collateralForResponseAmount: bignum;
};

export type CalculateCollateralForResponseIntput = {
  /** The address of the Rfq account. */
  rfq: PublicKey;
  /** The address of the response account. */
  response: PublicKey;
  /** The base asset index. */
  baseAssetIndex?: BaseAssetIndex;
};

export type CalculateCollateralForResponseBuilderParams =
  CalculateCollateralForResponseIntput;

export const calculateCollateralForResponseOperationHandler: OperationHandler<CalculateCollateralForResponseOperation> =
  {
    handle: async (
      operation: CalculateCollateralForResponseOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<CalculateCollateralForResponseOutput> => {
      scope.throwIfCanceled();

      const output = await calculateCollateralForResponsebuilder(
        convergence,
        operation.input,
        scope
      ).sendAndConfirm(convergence, scope.confirmOptions);

      const response = await convergence
        .rfqs()
        .findResponseByAddress({ address: operation.input.response });
      const collateralForResponseAmount = response.makerCollateralLocked;

      return { ...output, collateralForResponseAmount };
    },
  };

export const calculateCollateralForResponsebuilder = (
  convergence: Convergence,
  params: CalculateCollateralForResponseBuilderParams,
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
      instruction: createCalculateCollateralForResponseInstruction(
        {
          rfq,
          response,
          config,
          anchorRemainingAccounts,
        },

        riskEngineProgram.address
      ),
      signers: [],
      key: 'CalculateCollateralForResponseOperation',
    });
};
