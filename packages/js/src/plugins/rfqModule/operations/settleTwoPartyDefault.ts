import { createSettleTwoPartyDefaultInstruction } from '@convergence-rfq/rfq';
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

const Key = 'SettleTwoPartyDefaultOperation' as const;

/**
 * Settles two party default.
 *
 * ```ts
 * await convergence
 *   .rfqs()
 *   .settleTwoPartyDefault({ address };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const settleTwoPartyDefaultOperation =
  useOperation<SettleTwoPartyDefaultOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type SettleTwoPartyDefaultOperation = Operation<
  typeof Key,
  SettleTwoPartyDefaultInput,
  SettleTwoPartyDefaultOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type SettleTwoPartyDefaultInput = {
  /** The address of the protocol account. */
  protocol?: PublicKey;
  /** The address of the Rfq account. */
  rfq: PublicKey;
  /** The address of the Response account. */
  response: PublicKey;
  /** The address of the Taker's collateralInfo account. */
  takerCollateralInfo?: PublicKey;
  /** The address of the Maker's collateralInfo account. */
  makerCollateralInfo?: PublicKey;
  /** The address of the Taker's collateralTokens account. */
  takerCollateralTokens?: PublicKey;
  /** The address of the Maker's collateralTokens account. */
  makerCollateralTokens?: PublicKey;
  /** The address of the protocol's collateralTokens account. */
  protocolCollateralTokens?: PublicKey;
};

/**
 * @group Operations
 * @category Outputs
 */
export type SettleTwoPartyDefaultOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const settleTwoPartyDefaultOperationHandler: OperationHandler<SettleTwoPartyDefaultOperation> =
  {
    handle: async (
      operation: SettleTwoPartyDefaultOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<SettleTwoPartyDefaultOutput> => {
      const builder = await settleTwoPartyDefaultBuilder(
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
export type SettleTwoPartyDefaultBuilderParams = SettleTwoPartyDefaultInput;

/**
 * Settles two party default
 *
 * ```ts
 * const transactionBuilder = convergence
 *   .rfqs()
 *   .builders()
 *   .settleTwoPartyDefault({ address });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const settleTwoPartyDefaultBuilder = async (
  convergence: Convergence,
  params: SettleTwoPartyDefaultBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<TransactionBuilder> => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const { rfq, response } = params;

  const rfqProgram = convergence.programs().getRfq(programs);
  const tokenProgram = convergence.programs().getToken(programs);

  const protocol = await convergence.protocol().get();

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
  const [protocolCollateralTokensPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('collateral_token'), protocol.authority.toBuffer()],
    rfqProgram.address
  );

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .add({
      instruction: createSettleTwoPartyDefaultInstruction(
        {
          protocol: protocol.address,
          rfq,
          response,
          takerCollateralInfo: takerCollateralInfoPda,
          makerCollateralInfo: makerCollateralInfoPda,
          takerCollateralTokens: takerCollateralTokenPda,
          makerCollateralTokens: makerCollateralTokenPda,
          protocolCollateralTokens: protocolCollateralTokensPda,
          tokenProgram: tokenProgram.address,
        },
        rfqProgram.address
      ),
      signers: [],
      key: 'settleTwoPartyDefault',
    });
};
