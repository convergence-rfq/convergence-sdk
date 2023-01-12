import { createCalculateCollateralForRfqInstruction } from '@convergence-rfq/risk-engine';
import { PublicKey, AccountMeta } from '@solana/web3.js';
import { BaseAssetIndex } from '@convergence-rfq/rfq';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { Convergence } from '@/Convergence';

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

      return calculateCollateralForRfqbuilder(
        convergence,
        operation.input,
        scope
      ).sendAndConfirm(convergence, scope.confirmOptions);
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

  const rfqProgram = convergence.programs().getRfq(programs);
  const riskEngineProgram = convergence.programs().getRiskEngine(programs);

  const [config] = PublicKey.findProgramAddressSync(
    [Buffer.from('config')],
    riskEngineProgram.address
  );

  const SWITCHBOARD_BTC_ORACLE = new PublicKey(
    '8SXvChNYFhRq4EZuZvnhjrB3jJRQCv4k3P4W6hesH3Ee'
  );
  const [baseAsset] = PublicKey.findProgramAddressSync(
    [Buffer.from('base_asset'), toLittleEndian(baseAssetIndex.value, 2)],
    rfqProgram.address
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

function toLittleEndian(value: number, bytes: number) {
  const buf = Buffer.allocUnsafe(bytes);
  buf.writeUIntLE(value, 0, bytes);
  return buf;
}
