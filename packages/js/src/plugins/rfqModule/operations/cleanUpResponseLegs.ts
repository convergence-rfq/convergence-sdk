import { createCleanUpResponseLegsInstruction } from '@convergence-rfq/rfq';
import { PublicKey, AccountMeta } from '@solana/web3.js';
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
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
} from '@solana/spl-token';
import { Mint } from '@/plugins/tokenModule';

const Key = 'CleanUpResponseLegsOperation' as const;

/**
 * Cleans up Legs for a Response
 *
 * ```ts
 * await convergence
 *   .rfqs()
 *   .cleanUpResponseLegs({ address };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const cleanUpResponseLegsOperation =
  useOperation<CleanUpResponseLegsOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type CleanUpResponseLegsOperation = Operation<
  typeof Key,
  CleanUpResponseLegsInput,
  CleanUpResponseLegsOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type CleanUpResponseLegsInput = {
  /**
   * The address of the protocol
   */
  protocol?: PublicKey;

  dao: PublicKey;
  /** The address of the Rfq account */
  rfq: PublicKey;
  /** The address of the Reponse account */
  response: PublicKey;

  firstToPrepare: PublicKey;

  baseAssetMints: Mint[];

  /*
   * Args
   */

  legAmountToClear: number;
};

/**
 * @group Operations
 * @category Outputs
 */
export type CleanUpResponseLegsOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const cleanUpResponseLegsOperationHandler: OperationHandler<CleanUpResponseLegsOperation> =
  {
    handle: async (
      operation: CleanUpResponseLegsOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<CleanUpResponseLegsOutput> => {
      scope.throwIfCanceled();

      const builder = await cleanUpResponseLegsBuilder(
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
export type CleanUpResponseLegsBuilderParams = CleanUpResponseLegsInput;

/**
 * Cleans up Legs for a Response.
 *
 * ```ts
 * const transactionBuilder = convergence
 *   .rfqs()
 *   .builders()
 *   .cleanUpResponseLegs({ address });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const cleanUpResponseLegsBuilder = async (
  convergence: Convergence,
  params: CleanUpResponseLegsBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<TransactionBuilder> => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const {
    dao,
    rfq,
    response,
    firstToPrepare,
    baseAssetMints,
    legAmountToClear,
  } = params;

  const rfqProgram = convergence.programs().getRfq(programs);
  const protocol = await convergence.protocol().get();

  const anchorRemainingAccounts: AccountMeta[] = [];

  const rfqModel = await convergence.rfqs().findRfqByAddress({ address: rfq });
  const responseModel = await convergence
    .rfqs()
    .findResponseByAddress({ address: response });

  let initializedLegs = responseModel.legPreparationsInitializedBy.length;
  let mintIndex = 0;

  for (let i = initializedLegs - legAmountToClear; i < initializedLegs; i++) {
    const instrumentProgramAccount: AccountMeta = {
      pubkey: rfqModel.legs[i].instrumentProgram,
      isSigner: false,
      isWritable: false,
    };

    const [instrumentEscrowPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('escrow'), response.toBuffer(), Buffer.from([0, i])],
      rfqModel.legs[i].instrumentProgram
    );
    const legAccounts: AccountMeta[] = [
      {
        pubkey: firstToPrepare,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: instrumentEscrowPda,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: await getAssociatedTokenAddress(
          baseAssetMints[mintIndex].address,
          dao,
          undefined,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        ),
        isSigner: false,
        isWritable: true,
      },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ];

    anchorRemainingAccounts.push(instrumentProgramAccount, ...legAccounts);

    mintIndex++;
  }

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .add({
      instruction: createCleanUpResponseLegsInstruction(
        {
          protocol: protocol.address,
          rfq,
          response,
          anchorRemainingAccounts,
        },
        {
          legAmountToClear,
        },
        rfqProgram.address
      ),
      signers: [],
      key: 'cleanUpResponseLegs',
    });
};
