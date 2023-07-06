import { createRespondToRfqInstruction } from '@convergence-rfq/rfq';
import { PublicKey, ComputeBudgetProgram } from '@solana/web3.js';

import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { assertResponse, Response } from '../models/Response';
import { Convergence } from '../../../Convergence';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
  Signer,
} from '../../../types';
import { TransactionBuilder, TransactionBuilderOptions } from '../../../utils';
import { Quote, Rfq, toSolitaQuote } from '../models';
import { getRemainingAccounts } from '../../../plugins/instrumentModule';

const getNextResponsePdaAndDistinguisher = async (
  cvg: Convergence,
  rfq: PublicKey,
  maker: PublicKey,
  bid: Quote | null,
  ask: Quote | null,
  rfqModel: Rfq
): Promise<{
  pdaDistinguisher: number;
  response: PublicKey;
}> => {
  let response: PublicKey;
  let pdaDistinguisher = 0;
  while (true) {
    response = cvg
      .rfqs()
      .pdas()
      .response({
        rfq,
        maker,
        bid: bid && toSolitaQuote(bid, rfqModel.quoteAsset.getDecimals()),
        ask: ask && toSolitaQuote(ask, rfqModel.quoteAsset.getDecimals()),
        pdaDistinguisher,
      });

    const account = await cvg.rpc().getAccount(response);
    if (!account.exists) {
      return { response, pdaDistinguisher };
    }

    pdaDistinguisher++;
  }
};

const Key = 'RespondToRfqOperation' as const;

/**
 * Responds to an RFQ.
 *
 * ```ts
 * const { rfqResponse } = await convergence
 *   .rfqs()
 *   .respond({
 *     rfq: <address>,
 *     bid: {
 *       price: 12.4,
 *       legsMultiplierBps: 1.0
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
   * The optional bid side of the response.
   */
  bid?: Quote;

  /**
   * The optional ask side of the response.
   */
  ask?: Quote;

  /**
   * The address of the RFQ account.
   */
  rfq: PublicKey;

  /**
   * The maker of the Response as a Signer.
   *
   * @defaultValue `convergence.identity()`
   */
  maker?: Signer;

  /**
   * The protocol address.
   *
   * @defaultValue `convergence.protocol().pdas().protocol()`
   */
  protocol?: PublicKey;

  /**
   * Optional address of the taker collateral info account.
   *
   * @defaultValue `convergence.collateral().pdas().collateralInfo({ user: response.maker })`
   */
  collateralInfo?: PublicKey;

  /**
   * Optional address of the maker collateral tokens account.
   *
   * @defaultValue `convergence.collateral().pdas().collateralTokens({ user: maker.publicKey })`
   */
  collateralToken?: PublicKey;

  /**
   * Optional address of the risk engine account.
   *
   * @defaultValue `convergence.programs().getRiskEngine(programs)`
   */
  riskEngine?: PublicKey;
};

/**
 * @group Operations
 * @category Outputs
 */
export type RespondToRfqOutput = {
  /**
   * The blockchain response from sending and confirming the transaction.
   */
  response: SendAndConfirmTransactionResponse;

  /**
   * The newly created response.
   */
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
      const builder = await respondToRfqBuilder(
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

      const rfqResponse = await convergence
        .rfqs()
        .findResponseByAddress({ address: builder.getContext().response });
      assertResponse(rfqResponse);

      return { ...output, rfqResponse };
    },
  };

/**
 * @group Transaction Builders
 * @category Inputs
 */
export type RespondToRfqBuilderParams = RespondToRfqInput;

/**
 * @group Transaction Builders
 * @category Contexts
 */
export type RespondToRfqBuilderContext = {
  /** The computed address of the response PDA. */
  response: PublicKey;
};

/**
 * Responds to an RFQ.
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
): Promise<TransactionBuilder<RespondToRfqBuilderContext>> => {
  const { programs } = options;
  const {
    rfq,
    bid = null,
    ask = null,
    maker = convergence.identity(),
    protocol = convergence.protocol().pdas().protocol(),
    riskEngine = convergence.programs().getRiskEngine(programs).address,
    collateralInfo = convergence.collateral().pdas().collateralInfo({
      user: maker.publicKey,
      programs,
    }),
    collateralToken = convergence.collateral().pdas().collateralToken({
      user: maker.publicKey,
      programs,
    }),
  } = params;

  if (!bid && !ask) {
    throw new Error('Must provide either a bid and/or ask');
  }

  const rfqModel = await convergence.rfqs().findRfqByAddress({ address: rfq });
  const { response, pdaDistinguisher } =
    await getNextResponsePdaAndDistinguisher(
      convergence,
      rfq,
      maker.publicKey,
      bid,
      ask,
      rfqModel
    );

  const anchorRemainingAccounts = await getRemainingAccounts(
    convergence,
    rfqModel
  );

  return TransactionBuilder.make<RespondToRfqBuilderContext>()
    .setFeePayer(maker)
    .setContext({
      response,
    })
    .add(
      {
        instruction: ComputeBudgetProgram.setComputeUnitLimit({
          units: 1_400_000,
        }),
        signers: [],
      },
      {
        instruction: createRespondToRfqInstruction(
          {
            rfq,
            response,
            collateralInfo,
            collateralToken,
            protocol,
            riskEngine,
            maker: maker.publicKey,
            anchorRemainingAccounts,
          },
          {
            bid: bid && toSolitaQuote(bid, rfqModel.quoteAsset.getDecimals()),
            ask: ask && toSolitaQuote(ask, rfqModel.quoteAsset.getDecimals()),
            pdaDistinguisher,
          }
        ),
        signers: [maker],
        key: 'respondToRfq',
      }
    );
};
