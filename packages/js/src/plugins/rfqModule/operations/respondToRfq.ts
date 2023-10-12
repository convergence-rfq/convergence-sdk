import {
  Quote as SolitaQuote,
  createRespondToRfqInstruction,
} from '@convergence-rfq/rfq';
import { PublicKey, ComputeBudgetProgram } from '@solana/web3.js';

import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { assertResponse, Response } from '../models/Response';
import { Convergence } from '../../../Convergence';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '../../../types';
import { TransactionBuilder } from '../../../utils/TransactionBuilder';
import { Quote } from '../models';
import { toSolitaQuote } from '../models/Quote';

const getNextResponsePdaAndDistinguisher = async (
  cvg: Convergence,
  rfq: PublicKey,
  maker: PublicKey,
  bid: SolitaQuote | null,
  ask: SolitaQuote | null
): Promise<{
  pdaDistinguisher: number;
  response: PublicKey;
}> => {
  let response: PublicKey;
  let pdaDistinguisher = 0;
  while (true) {
    response = cvg.rfqs().pdas().response({
      rfq,
      maker,
      bid,
      ask,
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
      const builder = await respondToRfqBuilder(convergence, {
        ...operation.input,
      });
      scope.throwIfCanceled();

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
  params: RespondToRfqBuilderParams
): Promise<TransactionBuilder<RespondToRfqBuilderContext>> => {
  const { rfq, bid = null, ask = null } = params;
  const maker = convergence.identity();

  if (!bid && !ask) {
    throw new Error('Must provide either a bid and/or ask');
  }

  const rfqModel = await convergence.rfqs().findRfqByAddress({ address: rfq });
  const solitaBid =
    bid &&
    toSolitaQuote(bid, rfqModel.legAssetDecimals, rfqModel.quoteAssetDecimals);
  const solitaAsk =
    ask &&
    toSolitaQuote(ask, rfqModel.legAssetDecimals, rfqModel.quoteAssetDecimals);

  const { response, pdaDistinguisher } =
    await getNextResponsePdaAndDistinguisher(
      convergence,
      rfq,
      maker.publicKey,
      solitaBid,
      solitaAsk
    );

  return TransactionBuilder.make<RespondToRfqBuilderContext>()
    .setFeePayer(maker)
    .setContext({
      response,
    })
    .add({
      instruction: createRespondToRfqInstruction(
        {
          rfq,
          response,
          maker: maker.publicKey,
        },
        {
          bid: solitaBid,
          ask: solitaAsk,
          pdaDistinguisher,
        }
      ),
      signers: [maker],
      key: 'respondToRfq',
    });
};
