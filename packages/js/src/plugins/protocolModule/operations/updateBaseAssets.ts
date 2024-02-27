import { createChangeBaseAssetParametersInstruction } from '@convergence-rfq/rfq';
import { PublicKey } from '@solana/web3.js';

import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import {
  RiskCategory,
  PriceOracle,
  toSolitaRiskCategory,
  toSolitaPriceOracle,
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
import { toCustomOptionalF64, toCustomOptionalPubkey } from '../helpers';

const Key = 'updateBaseAssetOperation' as const;

/**
 * Add an BaseAsset
 *
 * ```ts
 * await convergence
 *   .rfqs()
 *   .updateBaseAsset({ address };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const updateBaseAssetOperation =
  useOperation<UpdateBaseAssetOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type UpdateBaseAssetOperation = Operation<
  typeof Key,
  UpdateBaseAssetInput,
  UpdateBaseAssetOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type UpdateBaseAssetInput = {
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
  index: number;

  enabled: boolean;

  riskCategory: RiskCategory;

  priceOracle: PriceOracle;
};

/**
 * @group Operations
 * @category Outputs
 */
export type UpdateBaseAssetOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const updateBaseAssetOperationHandler: OperationHandler<UpdateBaseAssetOperation> =
  {
    handle: async (
      operation: UpdateBaseAssetOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<UpdateBaseAssetOutput> => {
      scope.throwIfCanceled();

      const builder = updateBaseAssetBuilder(
        convergence,
        operation.input,
        scope
      );
      const { response } = await builder.sendAndConfirm(
        convergence,
        scope.confirmOptions
      );
      baseAssetsCache.clear();

      return { response };
    },
  };

/**
 * @group Transaction Builders
 * @category Inputs
 */
export type UpdateBaseAssetBuilderParams = UpdateBaseAssetInput;

/**
 * Adds an BaseAsset
 *
 * ```ts
 * const transactionBuilder = convergence
 *   .rfqs()
 *   .builders()
 *   .updateBaseAsset({ address });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const updateBaseAssetBuilder = (
  convergence: Convergence,
  params: UpdateBaseAssetBuilderParams,
  options: TransactionBuilderOptions = {}
): TransactionBuilder => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const rfqProgram = convergence.programs().getRfq(programs);
  const protocolPda = convergence.protocol().pdas().protocol();
  const {
    protocol = protocolPda,
    authority,
    index,
    enabled,
    riskCategory,
    priceOracle,
  } = params;

  const baseAsset = convergence.protocol().pdas().baseAsset({ index });
  const { oracleSource, inPlacePrice, pythOracle, switchboardOracle } =
    toSolitaPriceOracle(priceOracle);

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .addTxPriorityFeeIx(convergence)
    .add({
      instruction: createChangeBaseAssetParametersInstruction(
        {
          authority: authority.publicKey,
          protocol,
          baseAsset,
        },
        {
          enabled,
          riskCategory: toSolitaRiskCategory(riskCategory),
          oracleSource,
          inPlacePrice: toCustomOptionalF64(inPlacePrice),
          pythOracle: toCustomOptionalPubkey(pythOracle),
          switchboardOracle: toCustomOptionalPubkey(switchboardOracle),
        },
        rfqProgram.address
      ),
      signers: [authority],
      key: 'updateBaseAsset',
    });
};
