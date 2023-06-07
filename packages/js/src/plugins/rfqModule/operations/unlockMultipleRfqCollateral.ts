import { PublicKey, Transaction } from '@solana/web3.js';
import { createUnlockRfqCollateralInstruction } from '@convergence-rfq/rfq';

import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
  makeConfirmOptionsFinalizedOnMainnet,
} from '../../../types';
import { Convergence } from '../../../Convergence';
import { TransactionBuilder, TransactionBuilderOptions } from '../../../utils';

const Key = 'unlockMultipleRfqCollateralOperation' as const;

/**
 * Unlocks collateral for an Rfq
 *
 * ```ts
 * const rfq = await convergence
 *   .rfqs()
 *   .unlockMultipleRfqCollateral({ rfq: rfq.address });
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const unlockMultipleRfqCollateralOperation =
  useOperation<UnlockMultipleRfqCollateralOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type UnlockMultipleRfqCollateralOperation = Operation<
  typeof Key,
  UnlockMultipleRfqCollateralInput,
  UnlockMultipleRfqCollateralOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type UnlockMultipleRfqCollateralInput = {
  /**
   * The protocol address.
   *
   * @defaultValue `convergence.protocol().pdas().protocol()`
   */
  protocol?: PublicKey;

  /** The address of the Rfq account. */
  rfqs: PublicKey[];
};

/**
 * @group Operations
 * @category Outputs
 */
export type UnlockMultipleRfqCollateralOutput = {};

/**
 * @group Operations
 * @category Handlers
 */
export const unlockMultipleRfqCollateralOperationHandler: OperationHandler<UnlockMultipleRfqCollateralOperation> =
  {
    handle: async (
      operation: UnlockMultipleRfqCollateralOperation,
      convergence: Convergence,
      scope: OperationScope
    ) => {
      const txArray = await unlockMultipleRfqCollateralBuilder(
        convergence,
        {
          ...operation.input,
        },
        scope
      );
      scope.throwIfCanceled();

      const signedTnxs = await convergence
        .rpc()
        .signAllTransactions(txArray, [convergence.rpc().getDefaultFeePayer()]);
      const confirmOptions = makeConfirmOptionsFinalizedOnMainnet(
        convergence,
        scope.confirmOptions
      );
      for (const tx of signedTnxs) {
        await convergence.rpc().serializeAndSendTransaction(tx, confirmOptions);
      }
      scope.throwIfCanceled();
    },
  };

export type UnlockMultipleRfqCollateralBuilderParams =
  UnlockMultipleRfqCollateralInput;

/**
 * @group Transaction Builders
 * @category Contexts
 */
export type UnlockMultipleRfqCollateralBuilderContext =
  SendAndConfirmTransactionResponse;

/**
 * UnlockRfqs a collateral account.
 *
 * ```ts
 * const transactionBuilder = await convergence
 *   .rfqs()
 *   .builders()
 *   .unlockMultipleRfqCollateral();
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const unlockMultipleRfqCollateralBuilder = async (
  convergence: Convergence,
  params: UnlockMultipleRfqCollateralBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<Transaction[]> => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const { rfqs } = params;
  const txArray: Transaction[] = [];
  const rfqProgram = convergence.programs().getRfq(programs);
  for (const rfq of rfqs) {
    const rfqModel = await convergence
      .rfqs()
      .findRfqByAddress({ address: rfq });

    const collateralInfoPda = convergence.collateral().pdas().collateralInfo({
      user: rfqModel.taker,
      programs,
    });

    const txBuilder = TransactionBuilder.make()
      .setFeePayer(payer)
      .add({
        instruction: createUnlockRfqCollateralInstruction(
          {
            protocol: convergence.protocol().pdas().protocol(),
            rfq,
            collateralInfo: collateralInfoPda,
          },
          rfqProgram.address
        ),
        signers: [],
        key: 'unlockMultipleRfqCollateral',
      });
    const blockHashWithBlockHeight = await convergence
      .rpc()
      .getLatestBlockhash();
    const tx = txBuilder.toTransaction(blockHashWithBlockHeight);
    txArray.push(tx);
  }

  return txArray;
};
