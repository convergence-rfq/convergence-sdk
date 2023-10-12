import { createConfirmResponseInstruction } from '@convergence-rfq/rfq';
import { PublicKey } from '@solana/web3.js';

import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { Convergence } from '../../../Convergence';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '../../../types';
import {
  TransactionBuilder,
  TransactionBuilderOptions,
} from '../../../utils/TransactionBuilder';
import { ResponseSide, toSolitaQuoteSide } from '../models/ResponseSide';
import { toSolitaOverrideLegAmount } from '../models';

const Key = 'ConfirmResponseOperation' as const;

/**
 * Confirms a response.
 *
 * ```ts
 * await convergence
 *   .rfqs()
 *   .confirmResponse({
 *     rfq: <publicKey>,
 *     response: <publicKey>,
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
  /** The address of the response account. */
  response: PublicKey;

  /** The Side of the Response to confirm. */
  side: ResponseSide;

  overrideLegAmount?: number;
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
  const { response, side, overrideLegAmount } = params;
  const taker = convergence.identity();

  const responseModel = await convergence
    .rfqs()
    .findResponseByAddress({ address: response });
  const rfqModel = await convergence
    .rfqs()
    .findRfqByAddress({ address: responseModel.rfq });

  const solitaOverrideLegAmount =
    overrideLegAmount !== undefined
      ? toSolitaOverrideLegAmount(overrideLegAmount, rfqModel.legAssetDecimals)
      : null;

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .add({
      instruction: createConfirmResponseInstruction(
        {
          rfq: rfqModel.address,
          response,
          taker: taker.publicKey,
          legTokens: convergence.tokens().pdas().associatedTokenAccount({
            mint: rfqModel.legAsset,
            owner: taker.publicKey,
            programs,
          }),
          legEscrow: convergence.rfqs().pdas().legEscrow(responseModel.address),
          legMint: rfqModel.legAsset,
          quoteTokens: convergence.tokens().pdas().associatedTokenAccount({
            mint: rfqModel.quoteAsset,
            owner: taker.publicKey,
            programs,
          }),
          quoteEscrow: convergence
            .rfqs()
            .pdas()
            .quoteEscrow(responseModel.address),
          quoteMint: rfqModel.quoteAsset,
        },
        {
          side: toSolitaQuoteSide(side),
          overrideLegAmount: solitaOverrideLegAmount,
        },
        convergence.programs().getRfq(programs).address
      ),
      signers: [taker],
      key: 'confirmResponse',
    });
};
