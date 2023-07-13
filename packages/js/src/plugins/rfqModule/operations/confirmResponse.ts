import { createConfirmResponseInstruction } from '@convergence-rfq/rfq';
import { PublicKey, AccountMeta, ComputeBudgetProgram } from '@solana/web3.js';

import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { Convergence } from '../../../Convergence';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
  Signer,
} from '../../../types';
import { convertOverrideLegMultiplierBps } from '../helpers';
import {
  TransactionBuilder,
  TransactionBuilderOptions,
} from '../../../utils/TransactionBuilder';
import { ResponseSide, toSolitaSide } from '../models/ResponseSide';

const Key = 'ConfirmResponseOperation' as const;

/**
 * Confirms a response.
 *
 * ```ts
 * await convergence
 *   .rfqs()
 *   .confirmResponse({
 *     rfq: rfq.address,
 *     response: response.address,
 *     side: 'bid' | 'ask'
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
   * The address of the RFQ account.
   */
  rfq: PublicKey;

  /**
   * The address of the response account.
   */
  response: PublicKey;

  /**
   * The taker of the Rfq as a Signer.
   *
   * @defaultValue `convergence.identity()`
   */
  taker?: Signer;

  /**
   * Optional address of the taker collateral info account.
   *
   * @defaultValue `convergence.collateral().pdas().collateralInfo({ user: taker.publicKey })`
   */
  collateralInfo?: PublicKey;

  /**
   * Optional address of the maker collateral info account.
   *
   * @defaultValue `convergence.collateral().pdas().collateralInfo({ user: response.maker })`
   */
  makerCollateralInfo?: PublicKey;

  /**
   * The address of the collateral token.
   */
  collateralToken?: PublicKey;

  /**
   * The protocol address.
   *
   * @defaultValue `convergence.protocol().pdas().protocol()`
   */
  protocol?: PublicKey;

  /**
   * The address of the risk engine program.
   */
  riskEngine?: PublicKey;

  /** The Side of the Response to confirm. */
  side: ResponseSide;

  /**
   * Optional basis points multiplier to override the legMultiplierBps of the
   * Rfq's fixedSize property.
   */
  overrideLegMultiplierBps?: number;
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

      const output = await builder.sendAndConfirm(
        convergence,
        scope.confirmOptions
      );
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
    rfq,
    response,
    side,
    taker = convergence.identity(),
    collateralInfo = convergence.collateral().pdas().collateralInfo({
      user: taker.publicKey,
      programs,
    }),
    collateralToken = convergence.collateral().pdas().collateralToken({
      user: taker.publicKey,
      programs,
    }),
  } = params;

  let { overrideLegMultiplierBps = null } = params;

  if (overrideLegMultiplierBps) {
    overrideLegMultiplierBps = convertOverrideLegMultiplierBps(
      Number(overrideLegMultiplierBps)
    );
  }

  const responseModel = await convergence
    .rfqs()
    .findResponseByAddress({ address: response });
  const makerCollateralInfo = convergence.collateral().pdas().collateralInfo({
    user: responseModel.maker,
    programs,
  });

  const baseAssetIndexValuesSet: Set<number> = new Set();
  const rfqModel = await convergence.rfqs().findRfqByAddress({ address: rfq });
  for (const leg of rfqModel.legs) {
    baseAssetIndexValuesSet.add(leg.getBaseAssetIndex().value);
  }

  const baseAssetAccounts: AccountMeta[] = [];
  const oracleAccounts: AccountMeta[] = [];
  const baseAssetIndexValues = Array.from(baseAssetIndexValuesSet);
  for (const index of baseAssetIndexValues) {
    const baseAsset = convergence.protocol().pdas().baseAsset({ index });
    baseAssetAccounts.push({
      pubkey: baseAsset,
      isSigner: false,
      isWritable: false,
    });

    const baseAssetModel = await convergence
      .protocol()
      .findBaseAssetByAddress({ address: baseAsset });

    if (baseAssetModel.priceOracle.address) {
      oracleAccounts.push({
        pubkey: baseAssetModel.priceOracle.address,
        isSigner: false,
        isWritable: false,
      });
    }
  }

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .add(
      {
        instruction: ComputeBudgetProgram.setComputeUnitLimit({
          units: 1_400_000,
        }),
        signers: [],
      },
      {
        instruction: createConfirmResponseInstruction(
          {
            rfq,
            response,
            collateralInfo,
            makerCollateralInfo,
            collateralToken,
            taker: taker.publicKey,
            protocol: convergence.protocol().pdas().protocol(),
            riskEngine: convergence.programs().getRiskEngine(programs).address,
            anchorRemainingAccounts: [
              {
                pubkey: convergence.riskEngine().pdas().config(),
                isSigner: false,
                isWritable: false,
              },
              ...baseAssetAccounts,
              ...oracleAccounts,
            ],
          },
          {
            side: toSolitaSide(side),
            overrideLegMultiplierBps,
          },
          convergence.programs().getRfq(programs).address
        ),
        signers: [taker],
        key: 'confirmResponse',
      }
    );
};
