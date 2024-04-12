import { createAddBaseAssetInstruction } from '@convergence-rfq/rfq';
import { PublicKey } from '@solana/web3.js';

import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import {
  OracleSource,
  RiskCategory,
  toSolitaOracleSource,
  toSolitaRiskCategory,
} from '../models/BaseAsset';
import { Convergence } from '../../../Convergence';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
  Signer,
} from '../../../types';
import {
  TransactionBuilder,
  TransactionBuilderOptions,
} from '../../../utils/TransactionBuilder';
import { baseAssetsCache } from '../cache';
import { findVacantBaseAssetIndex } from '../helpers';

const Key = 'AddBaseAssetOperation' as const;

/**
 * Add an BaseAsset
 *
 * ```ts
 * await convergence
 *   .rfqs()
 *   .addBaseAsset({ address };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const addBaseAssetOperation = useOperation<AddBaseAssetOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type AddBaseAssetOperation = Operation<
  typeof Key,
  AddBaseAssetInput,
  AddBaseAssetOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type AddBaseAssetInput = {
  /**
   * The owner of the protocol.
   */
  authority: Signer;

  /**
   * The protocol to add the BaseAsset to.
   */
  protocol?: PublicKey;

  /**
   * The index of the BaseAsset.
   */
  index?: number;

  ticker: string;

  riskCategory?: RiskCategory;

  oracleSource?: OracleSource;

  inPlacePrice?: number;

  pythOracle?: PublicKey;

  switchboardOracle?: PublicKey;
};

/**
 * @group Operations
 * @category Outputs
 */
export type AddBaseAssetOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;

  baseAssetIndex: number;
};

/**
 * @group Operations
 * @category Handlers
 */
export const addBaseAssetOperationHandler: OperationHandler<AddBaseAssetOperation> =
  {
    handle: async (
      operation: AddBaseAssetOperation,
      cvg: Convergence,
      scope: OperationScope
    ): Promise<AddBaseAssetOutput> => {
      scope.throwIfCanceled();

      const { builder, baseAssetIndex } = await addBaseAssetBuilder(
        cvg,
        operation.input,
        scope
      );
      const { response } = await builder.sendAndConfirm(
        cvg,
        scope.confirmOptions
      );
      baseAssetsCache.clear();

      return { response, baseAssetIndex };
    },
  };

/**
 * @group Transaction Builders
 * @category Inputs
 */
export type AddBaseAssetBuilderParams = AddBaseAssetInput;

export type AddBaseAssetBuilderResult = {
  builder: TransactionBuilder;
  baseAssetIndex: number;
};

/**
 * Adds an BaseAsset
 *
 * ```ts
 * const transactionBuilder = convergence
 *   .rfqs()
 *   .builders()
 *   .addBaseAsset({ address });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const addBaseAssetBuilder = async (
  cvg: Convergence,
  params: AddBaseAssetBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<AddBaseAssetBuilderResult> => {
  const { programs, payer = cvg.rpc().getDefaultFeePayer() } = options;
  const rfqProgram = cvg.programs().getRfq(programs);
  const protocolPda = cvg.protocol().pdas().protocol();
  const {
    protocol = protocolPda,
    authority,
    index = await findVacantBaseAssetIndex(cvg),
    ticker,
    riskCategory = 'low',
    oracleSource = 'in-place',
    inPlacePrice = null,
    pythOracle = null,
    switchboardOracle = null,
  } = params;

  const baseAsset = cvg.protocol().pdas().baseAsset({ index });

  const builder = TransactionBuilder.make()
    .setFeePayer(payer)
    .addTxPriorityFeeIx(cvg)
    .add({
      instruction: createAddBaseAssetInstruction(
        {
          authority: authority.publicKey,
          protocol,
          baseAsset,
        },
        {
          index: { value: index },
          ticker,
          riskCategory: toSolitaRiskCategory(riskCategory),
          oracleSource: toSolitaOracleSource(oracleSource),
          inPlacePrice,
          pythOracle,
          switchboardOracle,
        },
        rfqProgram.address
      ),
      signers: [authority],
      key: 'addBaseAsset',
    });

  return {
    builder,
    baseAssetIndex: index,
  };
};
