import { createRespondToRfqInstruction, Quote } from '@convergence-rfq/rfq';
import {
  PublicKey,
  AccountMeta,
  ComputeBudgetProgram,
} from '@solana/web3.js';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { assertResponse, Response } from '../models/Response';
import { Convergence } from '@/Convergence';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
  Signer,
  makeConfirmOptionsFinalizedOnMainnet,
} from '@/types';
import { TransactionBuilder, TransactionBuilderOptions, Option } from '@/utils';

const Key = 'RespondToRfqOperation' as const;

/**
 * Responds to an Rfq.
 *
 * ```ts
 * const { rfqResponse } = await convergence
 *   .rfqs()
 *   .respond({
 *     rfq: rfq.address,
 *     bid: {
 *       __kind: 'FixedSize',
 *       priceQuote: { __kind: 'AbsolutePrice', amountBps: 1_000 },
 *     },
 *   });
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const respondToRfqOperation = useOperation<RespondToRfqOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type RespondToRfqOperation = Operation<
  typeof Key,
  RespondToRfqInput,
  RespondToRfqOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type RespondToRfqInput = {
  /**
   * The maker of the Response as a Signer.
   *
   * @defaultValue `convergence.identity()`
   *
   */
  maker?: Signer;

  /** The address of the protocol account. */
  protocol?: PublicKey;

  /** The address of the Rfq account. */
  rfq: PublicKey;

  /** Optional address of the Maker's collateral info account. */
  collateralInfo?: PublicKey;

  /** Optional address of the Maker's collateral token account. */
  collateralToken?: PublicKey;

  /** Optional address of the risk engine account.
   *
   * @defaultValue `convergence.programs().getRiskEngine(programs)`
   *
   */
  riskEngine?: PublicKey;

  /** The optional Bid side */
  bid?: Option<Quote>;

  /** The optional Ask side */
  ask?: Option<Quote>;
};

/**
 * @group Operations
 * @category Outputs
 */
export type RespondToRfqOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;

  /** The newly created Response. */
  rfqResponse: Response;
};

/**
 * @group Operations
 * @category Handlers
 */
export const respondToRfqOperationHandler: OperationHandler<RespondToRfqOperation> =
  {
    handle: async (
      operation: RespondToRfqOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<RespondToRfqOutput> => {
      const { rfq, maker = convergence.identity(), bid, ask } = operation.input;

      let pdaDistinguisher = 0;

      if (bid) {
        const parsedPriceQuoteAmountBps =
          (bid.priceQuote.amountBps as number) * Math.pow(10, 9);

        bid.priceQuote.amountBps = parsedPriceQuoteAmountBps;

        if (bid.__kind == 'Standard') {
          const parsedLegsMultiplierBps =
            (bid.legsMultiplierBps as number) * Math.pow(10, 9);

          bid.legsMultiplierBps = parsedLegsMultiplierBps;
        }
      }
      if (ask) {
        const parsedPriceQuoteAmountBps =
          (ask.priceQuote.amountBps as number) * Math.pow(10, 9);

        ask.priceQuote.amountBps = parsedPriceQuoteAmountBps;

        if (ask.__kind == 'Standard') {
          const parsedLegsMultiplierBps =
            (ask.legsMultiplierBps as number) * Math.pow(10, 9);

          ask.legsMultiplierBps = parsedLegsMultiplierBps;
        }
      }

      let responsePda = convergence
        .rfqs()
        .pdas()
        .response({
          rfq,
          maker: maker.publicKey,
          bid: bid ?? null,
          ask: ask ?? null,
          pdaDistinguisher,
        });

      let account = await convergence.rpc().getAccount(responsePda);

      while (account.exists) {
        pdaDistinguisher++;

        responsePda = convergence
          .rfqs()
          .pdas()
          .response({
            rfq,
            maker: maker.publicKey,
            bid: bid ?? null,
            ask: ask ?? null,
            pdaDistinguisher,
          });

        account = await convergence.rpc().getAccount(responsePda);
      }

      const builder = await respondToRfqBuilder(
        convergence,
        {
          ...operation.input,
          response: responsePda,
          bid,
          ask,
          pdaDistinguisher,
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

      const rfqResponse = await convergence
        .rfqs()
        .findResponseByAddress({ address: responsePda });
      assertResponse(rfqResponse);

      return { ...output, rfqResponse };
    },
  };

/**
 * @group Transaction Builders
 * @category Inputs
 */
export type RespondToRfqBuilderParams = RespondToRfqInput & {
  response: PublicKey;

  pdaDistinguisher: number;
};

/**
 * Responds to an Rfq.
 *
 * ```ts
 * const transactionBuilder = convergence
 *   .rfqs()
 *   .builders()
 *   .respond({ address });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const respondToRfqBuilder = async (
  convergence: Convergence,
  params: RespondToRfqBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<TransactionBuilder> => {
  const { programs } = options;
  const {
    rfq,
    maker = convergence.identity(),
    bid = null,
    ask = null,
    response,
    pdaDistinguisher,
  } = params;

  if (!bid && !ask) {
    throw new Error('Must provide either a bid or an ask');
  }

  const protocol = await convergence.protocol().get();

  const systemProgram = convergence.programs().getSystem(programs);
  const rfqProgram = convergence.programs().getRfq(programs);
  const riskEngineProgram = convergence.programs().getRiskEngine(programs);

  const collateralInfoPda = convergence.collateral().pdas().collateralInfo({
    user: maker.publicKey,
    programs,
  });
  const collateralTokenPda = convergence.collateral().pdas().collateralToken({
    user: maker.publicKey,
    programs,
  });

  const anchorRemainingAccounts: AccountMeta[] = [];

  const config = convergence.riskEngine().pdas().config();
  const configAccount: AccountMeta = {
    pubkey: config,
    isSigner: false,
    isWritable: false,
  };

  const {
    collateralInfo = collateralInfoPda,
    collateralToken = collateralTokenPda,
    riskEngine = riskEngineProgram.address,
  } = params;

  const rfqModel = await convergence.rfqs().findRfqByAddress({ address: rfq });

  const baseAssetAccounts: AccountMeta[] = [];
  const baseAssetIndexValuesSet: Set<number> = new Set();

  const oracleAccounts: AccountMeta[] = [];

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
    .setFeePayer(maker)
    .setContext({
      response,
    })
    .add(
      {
        instruction: ComputeBudgetProgram.setComputeUnitLimit({
          units: 1400000,
        }),
        signers: [],
      },
      {
        instruction: createRespondToRfqInstruction(
          {
            maker: maker.publicKey,
            protocol: protocol.address,
            rfq,
            response,
            collateralInfo,
            collateralToken,
            riskEngine,
            systemProgram: systemProgram.address,
            anchorRemainingAccounts,
          },
          {
            bid,
            ask,
            pdaDistinguisher,
          },
          rfqProgram.address
        ),
        signers: [maker],
        key: 'respondToRfq',
      }
    );
};
