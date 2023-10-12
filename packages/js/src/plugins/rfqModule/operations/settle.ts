import { createSettleInstruction } from '@convergence-rfq/rfq';
import { PublicKey } from '@solana/web3.js';

import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { Convergence } from '../../../Convergence';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
  makeConfirmOptionsFinalizedOnMainnet,
} from '../../../types';
import {
  TransactionBuilder,
  TransactionBuilderOptions,
} from '../../../utils/TransactionBuilder';

const Key = 'SettleOperation' as const;

/**
 * Settles.
 *
 * ```ts
 * await convergence
 *   .rfqs()
 *   .settle({ address };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const settleOperation = useOperation<SettleOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type SettleOperation = Operation<typeof Key, SettleInput, SettleOutput>;

/**
 * @group Operations
 * @category Inputs
 */
export type SettleInput = {
  /** The address of the response account. */
  response: PublicKey;
};

/**
 * @group Operations
 * @category Outputs
 */
export type SettleOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const settleOperationHandler: OperationHandler<SettleOperation> = {
  handle: async (
    operation: SettleOperation,
    convergence: Convergence,
    scope: OperationScope
  ): Promise<SettleOutput> => {
    const builder = await settleBuilder(
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
export type SettleBuilderParams = SettleInput;

/**
 * Settles
 *
 * ```ts
 * const transactionBuilder = convergence
 *   .rfqs()
 *   .builders()
 *   .settle({ address });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const settleBuilder = async (
  convergence: Convergence,
  params: SettleBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<TransactionBuilder> => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const { response } = params;

  const responseModel = await convergence
    .rfqs()
    .findResponseByAddress({ address: response });
  const rfqModel = await convergence
    .rfqs()
    .findRfqByAddress({ address: responseModel.rfq });

  const maker = convergence.identity();
  if (!maker.publicKey.equals(responseModel.maker)) {
    throw new Error('Only maker can settle a response!');
  }

  const rfqProgram = convergence.programs().getRfq(programs);

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .add({
      instruction: createSettleInstruction(
        {
          maker: responseModel.maker,
          taker: rfqModel.taker,
          rfq: rfqModel.address,
          response,
          takerLegTokens: convergence.tokens().pdas().associatedTokenAccount({
            mint: rfqModel.legAsset,
            owner: rfqModel.taker,
            programs,
          }),
          makerLegTokens: convergence.tokens().pdas().associatedTokenAccount({
            mint: rfqModel.legAsset,
            owner: maker.publicKey,
            programs,
          }),
          legEscrow: convergence.rfqs().pdas().legEscrow(responseModel.address),
          takerQuoteTokens: convergence.tokens().pdas().associatedTokenAccount({
            mint: rfqModel.quoteAsset,
            owner: rfqModel.taker,
            programs,
          }),
          makerQuoteTokens: convergence.tokens().pdas().associatedTokenAccount({
            mint: rfqModel.quoteAsset,
            owner: maker.publicKey,
            programs,
          }),
          quoteEscrow: convergence
            .rfqs()
            .pdas()
            .quoteEscrow(responseModel.address),
        },
        rfqProgram.address
      ),
      signers: [maker],
      key: 'settle',
    });
};
