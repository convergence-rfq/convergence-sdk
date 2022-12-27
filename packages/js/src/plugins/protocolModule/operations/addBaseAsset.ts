import {
  createAddBaseAssetInstruction,
  BaseAssetIndex,
  RiskCategory,
  PriceOracle,
} from '@convergence-rfq/rfq';
import { PublicKey } from '@solana/web3.js';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { Convergence } from '@/Convergence';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
  Signer,
} from '@/types';
import { TransactionBuilder, TransactionBuilderOptions } from '@/utils';

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
  protocol: PublicKey;

  baseAsset: PublicKey;

  /*
   * ARGS
   */

  index: BaseAssetIndex;

  ticker: string;

  riskCategory?: RiskCategory;

  priceOracle: PriceOracle;
};

/**
 * @group Operations
 * @category Outputs
 */
export type AddBaseAssetOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
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
      scope.throwIfCanceled();

      return addBaseAssetBuilder(
        convergence,
        operation.input,
        scope
      ).sendAndConfirm(convergence, scope.confirmOptions);
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
  const {
    authority,
    protocol,
    baseAsset,
    index,
    ticker,
    riskCategory = RiskCategory.Medium,
    priceOracle,
  } = params;

  const rfqProgram = convergence.programs().getRfq(programs);

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
          index,
          ticker,
          riskCategory,
          priceOracle,
        },
        rfqProgram.address
      ),
      signers: [authority],
      key: 'addBaseAsset',
    });
};
