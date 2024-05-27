import {
  LockedCollateralRecord,
  LockedCollateralRecordArgs,
  createRemoveLockedCollateralRecordInstruction,
} from '@convergence-rfq/hxro-print-trade-provider';
import dexterity from '@hxronetwork/dexterity-ts';

import BN from 'bn.js';
import { Transaction } from '@solana/web3.js';
import { getHxroProgramFromIDL } from '../program';
import { fetchValidHxroMpg } from '../helpers';
import { hxroManifestCache } from '../cache';
import { WithPubkey } from '../types';
import { Convergence } from '@/Convergence';
import {
  Operation,
  OperationHandler,
  OperationScope,
  PublicKey,
  useOperation,
} from '@/types';
import { TransactionBuilder, TransactionBuilderOptions } from '@/utils';
import { SendAndConfirmTransactionResponse } from '@/plugins/rpcModule';
import { isLocalEnv } from '@/utils/helpers';

const Key = 'unlockHxroCollateralByRecord' as const;

export const unlockHxroCollateralByRecordOperation =
  useOperation<UnlockHxroCollateralByRecordOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type UnlockHxroCollateralByRecordOperation = Operation<
  typeof Key,
  UnlockHxroCollateralByRecordInput,
  UnlockHxroCollateralByRecordOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type UnlockHxroCollateralByRecordInput = {
  lockRecord: PublicKey | WithPubkey<LockedCollateralRecordArgs>;

  // 'unlock-and-remove-record' is a default action
  action?: 'unlock' | 'remove-record' | 'unlock-and-remove-record';
};
/**
 * @group Operations
 * @category Outputs
 */
export type UnlockHxroCollateralByRecordOutput =
  SendAndConfirmTransactionResponse;

/**
 * @group Operations
 * @category Handlers
 */
export const unlockHxroCollateralByRecordOperationHandler: OperationHandler<UnlockHxroCollateralByRecordOperation> =
  {
    handle: async (
      operation: UnlockHxroCollateralByRecordOperation,
      cvg: Convergence,
      scope: OperationScope
    ): Promise<UnlockHxroCollateralByRecordOutput> => {
      const {
        input: { lockRecord, action = 'unlock-and-remove-record' },
      } = operation;

      let lockRecordData: WithPubkey<LockedCollateralRecordArgs>;
      if ('publicKey' in lockRecord) {
        lockRecordData = lockRecord;
      } else {
        const accountData = await LockedCollateralRecord.fromAccountAddress(
          cvg.connection,
          lockRecord
        );
        lockRecordData = { ...accountData, publicKey: lockRecord };
      }

      const unlockHxroCollateralTxBuilder =
        TransactionBuilder.make().setFeePayer(cvg.identity());
      const removeRecordCollateralTxBuilder =
        TransactionBuilder.make().setFeePayer(cvg.identity());

      if (action == 'unlock' || action == 'unlock-and-remove-record') {
        unlockHxroCollateralTxBuilder.add(
          await unlockHxroCollateralBuilder(
            cvg,
            {
              lockRecord: lockRecordData,
            },
            scope
          )
        );
      }

      if (action == 'remove-record' || action == 'unlock-and-remove-record') {
        removeRecordCollateralTxBuilder.add(
          await removeLockCollateralRecordBuilder(
            cvg,
            {
              lockRecord: lockRecordData,
            },
            scope
          )
        );
      }
      const lastValidBlockHeight = await cvg.rpc().getLatestBlockhash();
      const txs: Transaction[] = [];
      if (action == 'unlock' || action == 'unlock-and-remove-record') {
        txs.push(
          unlockHxroCollateralTxBuilder.toTransaction(lastValidBlockHeight)
        );
      }
      if (action == 'remove-record' || action == 'unlock-and-remove-record') {
        txs.push(
          removeRecordCollateralTxBuilder.toTransaction(lastValidBlockHeight)
        );
      }

      if (txs.length === 0) {
        throw new Error('No transactions to send');
      }
      const signedTxs = await cvg.identity().signAllTransactions(txs);
      let txResponse: SendAndConfirmTransactionResponse | null = null;
      for (const tx of signedTxs) {
        txResponse = await cvg.rpc().serializeAndSendTransaction(tx);
      }
      if (!txResponse) {
        throw new Error('No transaction response');
      }
      return txResponse;
    },
  };

export const removeLockCollateralRecordBuilder = async (
  cvg: Convergence,
  params: { lockRecord: WithPubkey<LockedCollateralRecordArgs> },
  options: TransactionBuilderOptions = {}
): Promise<TransactionBuilder> => {
  const { programs, payer = cvg.rpc().getDefaultFeePayer() } = options;
  const { lockRecord } = params;

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .add({
      instruction: createRemoveLockedCollateralRecordInstruction(
        {
          user: cvg.identity().publicKey,
          lockedCollateralRecord: lockRecord.publicKey,
        },
        cvg.programs().getHxroPrintTradeProvider(programs).address
      ),
      signers: [cvg.identity()],
      key: 'removeLockCollateralRecord',
    });
};

export const unlockHxroCollateralBuilder = async (
  cvg: Convergence,
  params: { lockRecord: LockedCollateralRecordArgs },
  options: TransactionBuilderOptions = {}
): Promise<TransactionBuilder<{}>> => {
  const { lockRecord } = params;
  const { payer = cvg.rpc().getDefaultFeePayer() } = options;

  const manifest = await hxroManifestCache.get(cvg);
  const mpg = await fetchValidHxroMpg(cvg, manifest);

  const userTrg = await manifest.getTRG(lockRecord.trg);

  const [covarianceAddress] = PublicKey.findProgramAddressSync(
    [Buffer.from('s'), mpg.pubkey.toBuffer()],
    mpg.riskEngineProgramId
  );
  const [correlationAddress] = PublicKey.findProgramAddressSync(
    [Buffer.from('r'), mpg.pubkey.toBuffer()],
    mpg.riskEngineProgramId
  );
  const [markPricesAddress] = PublicKey.findProgramAddressSync(
    [Buffer.from('mark_prices'), mpg.pubkey.toBuffer()],
    mpg.riskEngineProgramId
  );

  const idlProgram = await getHxroProgramFromIDL(cvg, manifest);
  const instruction = await idlProgram.methods
    .unlockCollateral({
      numProducts: new BN(6),
      products: lockRecord.locks,
    })
    .accounts({
      user: payer.publicKey,
      traderRiskGroup: lockRecord.trg,
      marketProductGroup: mpg.pubkey,
      feeModelProgram: mpg.feeModelProgramId,
      feeModelConfigurationAcct: mpg.feeModelConfigurationAcct,
      feeOutputRegister: mpg.feeOutputRegister,
      riskEngineProgram: mpg.riskEngineProgramId,
      riskModelConfigurationAcct: mpg.riskModelConfigurationAcct,
      riskOutputRegister: mpg.riskOutputRegister,
      riskAndFeeSigner: dexterity.Manifest.GetRiskAndFeeSigner(mpg.pubkey),
      feeStateAcct: userTrg.feeStateAccount,
      riskStateAcct: userTrg.riskStateAccount,
    })
    .remainingAccounts([
      {
        pubkey: covarianceAddress,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: correlationAddress,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: markPricesAddress,
        isSigner: false,
        isWritable: true,
      },
    ])
    .instruction();

  const txBuilder = TransactionBuilder.make<{}>()
    .setFeePayer(payer)
    .add({
      instruction,
      signers: [payer],
      key: 'unlockHxroCollateral',
    });

  if (!isLocalEnv(cvg)) {
    const trader = new dexterity.Trader(manifest, lockRecord.trg, true);

    await trader.connect(null, null);
    const updateMarkPriceIx = trader.getUpdateMarkPricesIx();
    updateMarkPriceIx.keys[0].pubkey = payer.publicKey;

    txBuilder.prepend({
      instruction: updateMarkPriceIx,
      signers: [payer],
      key: 'updateMarkPrices',
    });
  }
  console.log('unlockHxroCollateralBuilder', txBuilder.checkTransactionFits());
  return txBuilder;
};
