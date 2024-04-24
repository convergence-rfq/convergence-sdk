import {
  Connection,
  Transaction,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import { TransactionBuilder } from './TransactionBuilder';
import { Convergence } from '@/Convergence';

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

    const computeUnits = await getComputeUnitsToBeConsumed(
      txToProcess,
      connection
    );
    if (!computeUnits) {
      throw new Error('Failed to get compute units consumed');
    }
    return {
      unitsConsumed: computeUnits.unitsConsumed,
      microLamports: avgPriorityFee,
    };
  } catch (error) {
    console.error(error);
    return null;
  }
};

type GetComputeUnitsToBeConsumed = {
  unitsConsumed: number;
} | null;

export const getComputeUnitsToBeConsumed = async (
  tx: Transaction | TransactionBuilder,
  connection: Connection
): Promise<GetComputeUnitsToBeConsumed> => {
  try {
    let txToProcess: Transaction;
    const latestBlockhash = await connection.getLatestBlockhash();
    if (tx instanceof TransactionBuilder) {
      txToProcess = tx.toTransaction(latestBlockhash);
    } else {
      txToProcess = tx;
    }
    const ixs = txToProcess.instructions.map((ix) => ix);

    if (!txToProcess.feePayer) {
      throw new Error('Transaction must have a fee payer');
    }

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
    };
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const addComputeBudgetIxsIfNeeded = async (
  txBuilder: TransactionBuilder,
  convergence: Convergence
) => {
  const computeUnitsConsumed = await getComputeUnitsToBeConsumed(
    txBuilder,
    convergence.connection
  );
  if (!computeUnitsConsumed) {
    return txBuilder;
  }
  if (convergence.transactionPriority === 'dynamic') {
    const estimatedTxFeeWithComputeUnits =
      await getEstimatedPriorityFeeInMicorLamps(
        txBuilder,
        convergence.connection
      );

    if (!estimatedTxFeeWithComputeUnits) {
      return txBuilder;
    }
    txBuilder.addDynamicComputeBudgetIxs(
      estimatedTxFeeWithComputeUnits.microLamports,
      estimatedTxFeeWithComputeUnits.unitsConsumed
    );
  } else {
    txBuilder.addStaticComputeBudgetIxs(
      convergence,
      computeUnitsConsumed.unitsConsumed
    );
  }
};
