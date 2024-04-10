import { createAddUserAssetInstruction } from '@convergence-rfq/rfq';
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
import { baseAssetsCache, registeredMintsCache } from '../cache';
import { findVacantBaseAssetIndex } from '../helpers';

const Key = 'AddUserAssetOperation' as const;

export const addUserAssetOperation = useOperation<AddUserAssetOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type AddUserAssetOperation = Operation<
  typeof Key,
  AddUserAssetInput,
  AddUserAssetOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type AddUserAssetInput = {
  ticker: string;

  mint: PublicKey;

  baseAssetIndex?: number;
};

/**
 * @group Operations
 * @category Outputs
 */
export type AddUserAssetOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;

  baseAssetIndex: number;
};

/**
 * @group Operations
 * @category Handlers
 */
export const addUserAssetOperationHandler: OperationHandler<AddUserAssetOperation> =
  {
    handle: async (
      operation: AddUserAssetOperation,
      cvg: Convergence,
      scope: OperationScope
    ): Promise<AddUserAssetOutput> => {
      scope.throwIfCanceled();

      const { builder, baseAssetIndex } = await addUserAssetBuilder(
        cvg,
        operation.input,
        scope
      );
      const { response } = await builder.sendAndConfirm(
        cvg,
        scope.confirmOptions
      );
      baseAssetsCache.clear();
      registeredMintsCache.clear();

      return { response, baseAssetIndex };
    },
  };

/**
 * @group Transaction Builders
 * @category Inputs
 */
export type AddUserAssetBuilderParams = AddUserAssetInput;

export type AddUserAssetBuilderResult = {
  builder: TransactionBuilder;
  baseAssetIndex: number;
};

/**
 * Adds an UserAsset
 *
 * ```ts
 * const transactionBuilder = convergence
 *   .rfqs()
 *   .builders()
 *   .addUserAsset({ address });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const addUserAssetBuilder = async (
  cvg: Convergence,
  params: AddUserAssetBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<AddUserAssetBuilderResult> => {
  const { programs, payer = cvg.rpc().getDefaultFeePayer() } = options;
  const rfqProgram = cvg.programs().getRfq(programs);
  const protocolPda = cvg.protocol().pdas().protocol();
  const protocol = await cvg.protocol().get();
  const {
    ticker,
    mint,
    baseAssetIndex = await findVacantBaseAssetIndex(cvg),
  } = params;

  const baseAsset = cvg.protocol().pdas().baseAsset({ index: baseAssetIndex });
  const mintInfo = cvg.protocol().pdas().mintInfo({ mint });

  let mintRegistered = false;
  try {
    await cvg.protocol().findRegisteredMintByAddress({ address: mintInfo });
    mintRegistered = true;
  } catch (e) {}
  if (mintRegistered) {
    throw new Error(`Mint ${mint.toString()} had been already registered`);
  }

  const builder = TransactionBuilder.make()
    .setFeePayer(payer)
    .addTxPriorityFeeIx(cvg)
    .add({
      instruction: createAddUserAssetInstruction(
        {
          creator: cvg.identity().publicKey,
          authority: protocol.authority,
          protocol: protocolPda,
          baseAsset,
          mintInfo,
          mint,
        },
        {
          index: { value: baseAssetIndex },
          ticker,
        },
        rfqProgram.address
      ),
      signers: [cvg.identity()],
      key: 'addUserAsset',
    });

  return { builder, baseAssetIndex };
};
