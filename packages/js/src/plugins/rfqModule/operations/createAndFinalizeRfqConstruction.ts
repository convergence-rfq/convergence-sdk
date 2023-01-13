import { BaseAssetIndex } from '@convergence-rfq/rfq';
import { PublicKey, Keypair } from '@solana/web3.js';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { SpotInstrument } from '../../spotInstrumentModule';
import { PsyoptionsEuropeanInstrument } from '../../psyoptionsEuropeanInstrumentModule';
import { OrderType, QuoteAsset, FixedSize } from '../types';
import { Rfq } from '../models';
import { createRfqBuilder } from './createRfq';
import { finalizeRfqConstructionBuilder } from './finalizeRfqConstruction';
import { TransactionBuilder, TransactionBuilderOptions } from '@/utils';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
  Signer,
  makeConfirmOptionsFinalizedOnMainnet,
} from '@/types';
import { Convergence } from '@/Convergence';

const Key = 'CreateAndFinalizeRfqConstructionOperation' as const;

/**
 * Creates and createAndFinalizes construction of an Rfq.
 *
 * ```ts
 * const { rfq } = await convergence
 *   .rfqs()
 *   .createAndFinalize({ ... });
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const createAndFinalizeRfqConstructionOperation =
  useOperation<CreateAndFinalizeRfqConstructionOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type CreateAndFinalizeRfqConstructionOperation = Operation<
  typeof Key,
  CreateAndFinalizeRfqConstructionInput,
  CreateAndFinalizeRfqConstructionOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type CreateAndFinalizeRfqConstructionInput = {
  /**
   * The taker of the Rfq to create.
   *
   * @defaultValue `convergence.identity().publicKey`
   */
  taker?: Signer;

  /** Optional Rfq keypair. */
  keypair?: Keypair;

  /** Quote asset account. */
  quoteAsset: QuoteAsset;

  /** The legs of the order. */
  instruments: (SpotInstrument | PsyoptionsEuropeanInstrument)[];

  /** The type of order. */
  orderType: OrderType;

  fixedSize: FixedSize;

  activeWindow?: number;

  settlingWindow?: number;

  /** The address of the Taker's collateral_info account */
  collateralInfo?: PublicKey;

  /** The address of the Taker's collateral_token account */
  collateralToken?: PublicKey;

  /** The address of the risk_engine account */
  riskEngine?: PublicKey;

  /** The base asset index. */
  baseAssetIndex?: BaseAssetIndex;
};

/**
 * @group Operations
 * @category Outputs
 */
export type CreateAndFinalizeRfqConstructionOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;

  rfq: Rfq;
};

/**
 * @group Operations
 * @category Handlers
 */
export const createAndFinalizeRfqConstructionOperationHandler: OperationHandler<CreateAndFinalizeRfqConstructionOperation> =
  {
    handle: async (
      operation: CreateAndFinalizeRfqConstructionOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<CreateAndFinalizeRfqConstructionOutput> => {
      const { keypair = Keypair.generate() } = operation.input;

      const builder = await createAndFinalizeRfqConstructionBuilder(
        convergence,
        { ...operation.input, keypair },
        scope
      );
      scope.throwIfCanceled();

      const confirmOptions = makeConfirmOptionsFinalizedOnMainnet(
        convergence,
        scope.confirmOptions
      );
      const output = await builder.sendAndConfirm(convergence, confirmOptions);
      scope.throwIfCanceled();

      const rfq = await convergence
        .rfqs()
        .findRfqByAddress({ address: keypair.publicKey });

      return { ...output, rfq };
    },
  };

/**
 * @group Transaction Builders
 * @category Inputs
 */
export type CreateAndFinalizeRfqConstructionBuilderParams =
  CreateAndFinalizeRfqConstructionInput;

/**
 * @group Transaction Builders
 * @category Contexts
 */
export type CreateAndFinalizeRfqConstructionBuilderContext =
  SendAndConfirmTransactionResponse;

/**
 * createAndFinalizes an Rfq.
 *
 * ```ts
 * const transactionBuilder = await convergence
 *   .rfqs()
 *   .builders()
 *   .create();
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const createAndFinalizeRfqConstructionBuilder = async (
  convergence: Convergence,
  params: CreateAndFinalizeRfqConstructionBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<TransactionBuilder> => {
  const { payer = convergence.rpc().getDefaultFeePayer() } = options;

  const {
    taker = convergence.identity(),
    keypair = Keypair.generate(),
    orderType,
    instruments,
    quoteAsset,
    fixedSize,
    activeWindow = 5_000,
    settlingWindow = 1_000,
    collateralInfo,
    collateralToken,
    riskEngine,
    baseAssetIndex,
  } = params;

  const rfqBuilder = await createRfqBuilder(
    convergence,
    {
      keypair,
      taker,
      orderType,
      instruments,
      quoteAsset,
      fixedSize,
      activeWindow,
      settlingWindow,
    },
    options
  );
  const finalizeConstructionBuilder = await finalizeRfqConstructionBuilder(
    convergence,
    {
      taker,
      rfq: keypair.publicKey,
      collateralInfo,
      collateralToken,
      riskEngine,
      baseAssetIndex,
    },
    options
  );

  return TransactionBuilder.make()
    .setContext({
      keypair,
    })
    .setFeePayer(payer)
    .add(
      ...rfqBuilder.getInstructionsWithSigners(),
      ...finalizeConstructionBuilder.getInstructionsWithSigners()
    );
};
