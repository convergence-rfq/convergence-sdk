import { createConfirmResponseInstruction, Side } from '@convergence-rfq/rfq';
import { PublicKey, AccountMeta, ComputeBudgetProgram } from '@solana/web3.js';
import { bignum, COption } from '@convergence-rfq/beet';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { Convergence } from '@/Convergence';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
  Signer,
  makeConfirmOptionsFinalizedOnMainnet,
} from '@/types';
import { TransactionBuilder, TransactionBuilderOptions } from '@/utils';

const Key = 'ConfirmResponseOperation' as const;

/**
 * Confirms a response.
 *
 * ```ts
 *
 * const { rfq } = await convergence.rfqs.create(...);
 * const { rfqResponse } =
 *   await convergence
 *     .rfqs()
 *     .respond({ rfq: rfq.address, ... });
 *
 * await convergence
 *   .rfqs()
 *   .confirmResponse({
 *     rfq: rfq.address,
 *     response: rfqResponse.address,
 *     side: Side.Bid
 *   });
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const confirmResponseOperation =
  useOperation<ConfirmResponseOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type ConfirmResponseOperation = Operation<
  typeof Key,
  ConfirmResponseInput,
  ConfirmResponseOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type ConfirmResponseInput = {
  /**
   * The taker of the Rfq as a Signer.
   *
   * @defaultValue `convergence.identity()`
   */
  taker?: Signer;

  /** The address of the protocol. */
  protocol?: PublicKey;

  /** The address of the Rfq account. */
  rfq: PublicKey;

  /** The address of the Response. */
  response: PublicKey;

  /** The address of the Taker's collateral info account. */
  collateralInfo?: PublicKey;

  /** The address of the Maker's collateral info account. */
  makerCollateralInfo?: PublicKey;

  /** The address of the collateral token. */
  collateralToken?: PublicKey;

  /** The address of the risk engine program. */
  riskEngine?: PublicKey;

  /** The Side to confirm from the Response. */
  side: Side;

  /** ??? */
  overrideLegMultiplierBps?: COption<bignum>;
};

/**
 * @group Operations
 * @category Outputs
 */
export type ConfirmResponseOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const confirmResponseOperationHandler: OperationHandler<ConfirmResponseOperation> =
  {
    handle: async (
      operation: ConfirmResponseOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<ConfirmResponseOutput> => {
      const builder = await confirmResponseBuilder(
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

      return { ...output };
    },
  };

/**
 * @group Transaction Builders
 * @category Inputs
 */
export type ConfirmResponseBuilderParams = ConfirmResponseInput;

/**
 * Confirms a response
 *
 * ```ts
 * const transactionBuilder = convergence
 *   .rfqs()
 *   .builders()
 *   .confirmResponse({ address });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const confirmResponseBuilder = async (
  convergence: Convergence,
  params: ConfirmResponseBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<TransactionBuilder> => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const {
    taker = convergence.identity(),
    rfq,
    response,
    side,
    overrideLegMultiplierBps = null,
  } = params;

  const responseModel = await convergence
    .rfqs()
    .findResponseByAddress({ address: response });

  const protocol = await convergence.protocol().get();

  const rfqProgram = convergence.programs().getRfq(programs);
  const riskEngineProgram = convergence.programs().getRiskEngine(programs);

  const takerCollateralInfoPda = convergence
    .collateral()
    .pdas()
    .collateralInfo({
      user: taker.publicKey,
      programs,
    });
  const makerCollateralInfoPda = convergence
    .collateral()
    .pdas()
    .collateralInfo({
      user: responseModel.maker,
      programs,
    });
  const collateralTokenPda = convergence.collateral().pdas().collateralToken({
    user: taker.publicKey,
    programs,
  });

  const anchorRemainingAccounts: AccountMeta[] = [];

  const [config] = PublicKey.findProgramAddressSync(
    [Buffer.from('config')],
    riskEngineProgram.address
  );
  const configAccount: AccountMeta = {
    pubkey: config,
    isSigner: false,
    isWritable: false,
  };

  const rfqModel = await convergence.rfqs().findRfqByAddress({ address: rfq });

  let baseAssetAccounts: AccountMeta[] = [];
  let baseAssetIndexValuesSet: Set<number> = new Set();
  let oracleAccounts: AccountMeta[] = [];

  for (const leg of rfqModel.legs) {
    baseAssetIndexValuesSet.add(leg.baseAssetIndex.value);
  }

  const baseAssetIndexValues = Array.from(baseAssetIndexValuesSet);

  for (const value of baseAssetIndexValues) {
    const baseAsset = convergence
      .protocol()
      .pdas()
      .baseAsset({ index: { value } });

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
    .add(
      {
        instruction: ComputeBudgetProgram.setComputeUnitLimit({
          units: 1400000,
        }),
        signers: [],
      },
      {
        instruction: createConfirmResponseInstruction(
          {
            taker: taker.publicKey,
            protocol: protocol.address,
            rfq,
            response,
            collateralInfo: takerCollateralInfoPda,
            makerCollateralInfo: makerCollateralInfoPda,
            collateralToken: collateralTokenPda,
            riskEngine: riskEngineProgram.address,
            anchorRemainingAccounts,
          },
          {
            side,
            overrideLegMultiplierBps,
          },
          rfqProgram.address
        ),
        signers: [taker],
        key: 'confirmResponse',
      }
    );
};
