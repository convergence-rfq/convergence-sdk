import { createSettleOnePartyDefaultInstruction } from '@convergence-rfq/rfq';
import { PublicKey } from '@solana/web3.js';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { Convergence } from '@/Convergence';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
  makeConfirmOptionsFinalizedOnMainnet,
} from '@/types';
import { TransactionBuilder, TransactionBuilderOptions } from '@/utils';

const Key = 'SettleOnePartyDefaultOperation' as const;

/**
 * Settles one party default.
 *
 * ```ts
 * await convergence
 *   .rfqs()
 *   .settleOnePartyDefault({ address };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const settleOnePartyDefaultOperation =
  useOperation<SettleOnePartyDefaultOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type SettleOnePartyDefaultOperation = Operation<
  typeof Key,
  SettleOnePartyDefaultInput,
  SettleOnePartyDefaultOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type SettleOnePartyDefaultInput = {
  /** The address of the protocol account. */
  protocol?: PublicKey;
  /** The address of the Rfq account. */
  rfq: PublicKey;
  /** The address of the Response account. */
  response: PublicKey;
  /** The address of the Taker's collateralInfo account. */
};

/**
 * @group Operations
 * @category Outputs
 */
export type SettleOnePartyDefaultOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const settleOnePartyDefaultOperationHandler: OperationHandler<SettleOnePartyDefaultOperation> =
  {
    handle: async (
      operation: SettleOnePartyDefaultOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<SettleOnePartyDefaultOutput> => {
      const builder = await settleOnePartyDefaultBuilder(
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
export type SettleOnePartyDefaultBuilderParams = SettleOnePartyDefaultInput;

/**
 * Settles one party default
 *
 * ```ts
 * const transactionBuilder = convergence
 *   .rfqs()
 *   .builders()
 *   .settleOnePartyDefault({ address });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const settleOnePartyDefaultBuilder = async (
  convergence: Convergence,
  params: SettleOnePartyDefaultBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<TransactionBuilder> => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const { rfq, response } = params;

  const protocol = await convergence.protocol().get();

  const rfqProgram = convergence.programs().getRfq(programs);
  const tokenProgram = convergence.programs().getToken(programs);

  const rfqModel = await convergence.rfqs().findRfqByAddress({ address: rfq });
  const responseModel = await convergence
    .rfqs()
    .findResponseByAddress({ address: response });

  const [takerCollateralInfoPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('collateral_info'), rfqModel.taker.toBuffer()],
    rfqProgram.address
  );
  const [makerCollateralInfoPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('collateral_info'), responseModel.maker.toBuffer()],
    rfqProgram.address
  );
  const [takerCollateralTokenPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('collateral_token'), rfqModel.taker.toBuffer()],
    rfqProgram.address
  );
  const [makerCollateralTokenPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('collateral_token'), responseModel.maker.toBuffer()],
    rfqProgram.address
  );

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .add({
      instruction: createSettleOnePartyDefaultInstruction(
        {
          protocol: protocol.address,
          rfq,
          response,
          takerCollateralInfo: takerCollateralInfoPda,
          makerCollateralInfo: makerCollateralInfoPda,
          takerCollateralTokens: takerCollateralTokenPda,
          makerCollateralTokens: makerCollateralTokenPda,
          tokenProgram: tokenProgram.address,
        },
        rfqProgram.address
      ),
      signers: [],
      key: 'settleOnePartyDefault',
    });
};
