import { createCalculateCollateralForRfqInstruction } from '@convergence-rfq/risk-engine';
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

const Key = 'CalculateCollateralForRfqOperation' as const;

export const calculateCollateralForRfqOperation =
  useOperation<CalculateCollateralForRfqOperation>(Key);

export type CalculateCollateralForRfqOperation = Operation<
  typeof Key,
  CalculateCollateralForRfqIntput,
  CalculateCollateralForRfqOutput
>;

export type CalculateCollateralForRfqOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;

  collateralForRfqAmount: bignum;
};

export type CalculateCollateralForRfqIntput = {
  /** The address of the Rfq account. */
  rfq: PublicKey;
  /** The base asset index. */
  baseAssetIndex?: BaseAssetIndex;
};

export type CalculateCollateralForRfqBuilderParams =
  CalculateCollateralForRfqIntput;

export const calculateCollateralForRfqOperationHandler: OperationHandler<CalculateCollateralForRfqOperation> =
  {
    handle: async (
      operation: CalculateCollateralForRfqOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<CalculateCollateralForRfqOutput> => {
      scope.throwIfCanceled();

      const output = await calculateCollateralForRfqbuilder(
        convergence,
        operation.input,
        scope
      ).sendAndConfirm(convergence, scope.confirmOptions);

      const rfq = await convergence
        .rfqs()
        .findRfqByAddress({ address: operation.input.rfq });
      const collateralForRfqAmount = rfq.totalTakerCollateralLocked;
      return { ...output, collateralForRfqAmount };
    },
  };

export const calculateCollateralForRfqbuilder = (
  convergence: Convergence,
  params: CalculateCollateralForRfqBuilderParams,
  options: TransactionBuilderOptions = {}
): TransactionBuilder => {
  const anchorRemainingAccounts: AccountMeta[] = [];
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;

  const { rfq, baseAssetIndex = { value: 0 } } = params;

  const riskEngineProgram = convergence.programs().getRiskEngine(programs);
  const config = new RiskEnginePdasClient(convergence).config();

  const baseAsset = new ProtocolPdasClient(convergence).baseAsset({
    index: baseAssetIndex,
  });
  const SWITCHBOARD_BTC_ORACLE = new PublicKey(
    '8SXvChNYFhRq4EZuZvnhjrB3jJRQCv4k3P4W6hesH3Ee'
  );

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
      instruction: createCalculateCollateralForRfqInstruction(
        {
          rfq,
          config,
          anchorRemainingAccounts,
        },

        riskEngineProgram.address
      ),
      signers: [],
      key: 'CalculateCollateralForRfqOperation',
    });
};
