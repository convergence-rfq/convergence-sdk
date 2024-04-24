import {
  Connection,
  Transaction,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import { TransactionBuilder } from './TransactionBuilder';

type EstimatedPriorityFee = {
  unitsConsumed: number;
  microLamports: number;
} | null;

export const getEstimatedPriorityFeeInMicorLamps = async (
  tx: Transaction | TransactionBuilder,
  connection: Connection
): Promise<EstimatedPriorityFee> => {
  try {
    let txToProcess: Transaction;
    const latestBlockhash = await connection.getLatestBlockhash();
    if (tx instanceof TransactionBuilder) {
      txToProcess = tx.toTransaction(latestBlockhash);
    } else {
      txToProcess = tx;
    }
    if (!txToProcess.feePayer) {
      throw new Error('Transaction must have a fee payer');
    }
    const recentPriorityFeeData =
      await connection.getRecentPrioritizationFees();

    if (recentPriorityFeeData.length === 0) {
      throw new Error('Failed to get recent prioritization fees');
    }
    let avgPriorityFee = recentPriorityFeeData.reduce(
      (acc, { prioritizationFee }) => acc + prioritizationFee,
      0
    );
    avgPriorityFee /= recentPriorityFeeData.length;

    const ixs = txToProcess.instructions.map((ix) => ix);

    const txMessage = new TransactionMessage({
      payerKey: txToProcess.feePayer,
      recentBlockhash: latestBlockhash.blockhash,
      instructions: ixs,
    }).compileToV0Message();

    const versionedTx = new VersionedTransaction(txMessage);
    const simulateTxResult = await connection.simulateTransaction(versionedTx, {
      sigVerify: false,
    });
    const unitsConsumed = simulateTxResult.value?.unitsConsumed;
    if (!unitsConsumed) {
      throw new Error('Failed to get units consumed');
    }
    return {
      unitsConsumed,
      microLamports: avgPriorityFee,
    };
  } catch (error) {
    console.error(error);
    return null;
  }
};
