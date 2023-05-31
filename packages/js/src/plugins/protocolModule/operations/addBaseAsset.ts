import { createAddBaseAssetInstruction } from '@convergence-rfq/rfq';
import { PublicKey } from '@solana/web3.js';

import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import {
  BaseAsset,
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
import { TransactionBuilder, TransactionBuilderOptions } from '../../../utils';
import { baseAssetsCache } from '../cache';

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
  index: number;

  ticker: string;

  riskCategory: RiskCategory;

  priceOracle: PriceOracle;
};

/**
 * @group Operations
 * @category Outputs
 */
export type AddBaseAssetOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;

  baseAsset: BaseAsset;
};

/**
 * @group Operations
 * @category Handlers
 */
export const addBaseAssetOperationHandler: OperationHandler<AddBaseAssetOperation> =
  {
    handle: async (
      operation: AddBaseAssetOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<AddBaseAssetOutput> => {
      const { index } = operation.input;
      scope.throwIfCanceled();

      const builder = addBaseAssetBuilder(convergence, operation.input, scope);
      const { response } = await builder.sendAndConfirm(
        convergence,
        scope.confirmOptions
      );

      baseAssetsCache.clear();
      const baseAssetAddress = convergence
        .protocol()
        .pdas()
        .baseAsset({ index });
      const baseAsset = await convergence
        .protocol()
        .findBaseAssetByAddress({ address: baseAssetAddress });

      return { response, baseAsset };
    },
  };

/**
 * @group Transaction Builders
 * @category Inputs
 */
export type AddBaseAssetBuilderParams = AddBaseAssetInput;

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
export const addBaseAssetBuilder = (
  convergence: Convergence,
  params: AddBaseAssetBuilderParams,
  options: TransactionBuilderOptions = {}
): TransactionBuilder => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const rfqProgram = convergence.programs().getRfq(programs);
  const protocolPda = convergence.protocol().pdas().protocol();
  const {
    protocol = protocolPda,
    authority,
    index,
    ticker,
    riskCategory,
    priceOracle,
  } = params;

  const baseAsset = convergence.protocol().pdas().baseAsset({ index });

  return TransactionBuilder.make()
    .setFeePayer(payer)
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
          priceOracle: toSolitaPriceOracle(priceOracle),
        },
        rfqProgram.address
      ),
      signers: [authority],
      key: 'addBaseAsset',
    });
};
