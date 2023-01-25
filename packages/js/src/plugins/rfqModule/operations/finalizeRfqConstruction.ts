import { createFinalizeRfqConstructionInstruction } from '@convergence-rfq/rfq';
import { PublicKey, AccountMeta, ComputeBudgetProgram } from '@solana/web3.js';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { assertRfq, Rfq } from '../models';
import { TransactionBuilder, TransactionBuilderOptions } from '@/utils';
import {
  makeConfirmOptionsFinalizedOnMainnet,
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
  Signer,
} from '@/types';
import { Convergence } from '@/Convergence';

const Key = 'FinalizeRfqConstructionOperation' as const;

/**
 * Finalizes construction of an Rfq.
 *
 * ```ts
 * const { rfq } = await convergence
 *   .rfqs()
 *   .create();
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const finalizeRfqConstructionOperation =
  useOperation<FinalizeRfqConstructionOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type FinalizeRfqConstructionOperation = Operation<
  typeof Key,
  FinalizeRfqConstructionInput,
  FinalizeRfqConstructionOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type FinalizeRfqConstructionInput = {
  /**
   * The taker of the Rfq to create.
   *
   * @defaultValue `convergence.identity().publicKey`
   */
  taker?: Signer;

  /** The address of the Rfq account */
  rfq: PublicKey;

  /** The address of the Taker's collateral_info account */
  collateralInfo?: PublicKey;

  /** The address of the Taker's collateral_token account */
  collateralToken?: PublicKey;

  /** The address of the risk_engine account */
  riskEngine?: PublicKey;
};

/**
 * @group Operations
 * @category Outputs
 */
export type FinalizeRfqConstructionOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;

  rfq: Rfq;
};

/**
 * @group Operations
 * @category Handlers
 */
export const finalizeRfqConstructionOperationHandler: OperationHandler<FinalizeRfqConstructionOperation> =
  {
    handle: async (
      operation: FinalizeRfqConstructionOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<FinalizeRfqConstructionOutput> => {
      const { rfq: inputRfq } = operation.input;

      const builder = await finalizeRfqConstructionBuilder(
        convergence,
        {
          ...operation.input,
        },
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
        .findRfqByAddress({ address: inputRfq });
      assertRfq(rfq);

      return { ...output, rfq };
    },
  };

/**
 * @group Transaction Builders
 * @category Inputs
 */
export type FinalizeRfqConstructionBuilderParams = FinalizeRfqConstructionInput;

/**
 * @group Transaction Builders
 * @category Contexts
 */
export type FinalizeRfqConstructionBuilderContext =
  SendAndConfirmTransactionResponse;

/**
 * Finalizes an Rfq.
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
export const finalizeRfqConstructionBuilder = async (
  convergence: Convergence,
  params: FinalizeRfqConstructionBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<TransactionBuilder> => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;

  const riskEngineProgram = convergence.programs().getRiskEngine(programs);
  const rfqProgram = convergence.programs().getRfq(programs);

  const {
    taker = convergence.identity(),
    riskEngine = riskEngineProgram.address,
    rfq,
  } = params;
  let { collateralInfo, collateralToken } = params;

  const collateralInfoPda = convergence.collateral().pdas().collateralInfo({
    user: taker.publicKey,
    programs,
  });
  const collateralTokenPda = convergence.collateral().pdas().collateralToken({
    user: taker.publicKey,
    programs,
  });

  collateralInfo = collateralInfo ?? collateralInfoPda;
  collateralToken = collateralToken ?? collateralTokenPda;

  const anchorRemainingAccounts: AccountMeta[] = [];

  const protocol = convergence.protocol().pdas().protocol();

  const [config] = PublicKey.findProgramAddressSync(
    [Buffer.from('config')],
    riskEngineProgram.address
  );

  const configAccount: AccountMeta = {
    pubkey: config,
    isSigner: false,
    isWritable: false,
  };

  //@ts-ignore
  const rfqModel = await convergence.rfqs().findRfqByAddress({ address: rfq });

  let baseAssetAccounts: AccountMeta[] = [];
  let baseAssetIndexValuesSet: Set<number> = new Set();

  let oracleAccounts: AccountMeta[] = [];

  for (const leg of rfqModel.legs) {
    baseAssetIndexValuesSet.add(leg.baseAssetIndex.value);
  }

  const baseAssetIndexValues = Array.from(baseAssetIndexValuesSet);

  for (const value of baseAssetIndexValues) {
    const baseAsset = convergence.rfqs().pdas().baseAsset({
      baseAssetIndexValue: value,
      programs,
    });

    const baseAssetAccount: AccountMeta = {
      pubkey: baseAsset,
      isSigner: false,
      isWritable: false,
    };

    baseAssetAccounts.push(baseAssetAccount);

    const baseAssetModel = await convergence
      .protocol()
      .findBaseAssetByAddress({ address: baseAsset });

    const oracleAccount: AccountMeta = {
      pubkey: baseAssetModel.priceOracle.address,
      isSigner: false,
      isWritable: false,
    };

    oracleAccounts.push(oracleAccount);
  }

  anchorRemainingAccounts.push(
    configAccount,
    ...baseAssetAccounts,
    ...oracleAccounts
  );

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .setContext({
      rfq,
    })
    .add(
      {
        instruction: ComputeBudgetProgram.setComputeUnitLimit({
          units: 1400000,
        }),
        signers: [],
      },
      {
        instruction: createFinalizeRfqConstructionInstruction(
          {
            taker: taker.publicKey,
            protocol,
            rfq,
            collateralInfo,
            collateralToken,
            riskEngine,
            anchorRemainingAccounts,
          },
          rfqProgram.address
        ),
        signers: [taker],
        key: 'finalizeRfqConstruction',
      }
    );
};
