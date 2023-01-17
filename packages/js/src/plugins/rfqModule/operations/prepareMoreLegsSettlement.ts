import { PublicKey, AccountMeta, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import {
  createPrepareMoreLegsSettlementInstruction,
  AuthoritySide,
} from '@convergence-rfq/rfq';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
  Signer,
  makeConfirmOptionsFinalizedOnMainnet,
} from '@/types';
import { Convergence } from '@/Convergence';
import { TransactionBuilder, TransactionBuilderOptions } from '@/utils';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
} from '@solana/spl-token';
import { Mint } from '@/plugins/tokenModule';

const Key = 'PrepareMoreLegsSettlementOperation' as const;

/**
 * Prepares more legs settlement
 *
 * ```ts
 * const rfq = await convergence
 *   .rfqs()
 *   .prepareMoreLegsSettlement({ address };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const prepareMoreLegsSettlementOperation =
  useOperation<PrepareMoreLegsSettlementOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type PrepareMoreLegsSettlementOperation = Operation<
  typeof Key,
  PrepareMoreLegsSettlementInput,
  PrepareMoreLegsSettlementOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type PrepareMoreLegsSettlementInput = {
  /**
   * The owner of the Rfq as a Signer.
   *
   * @defaultValue `convergence.identity()`
   */
  caller?: Signer;
  /** The protocol address */
  protocol?: PublicKey;
  /** The Rfq address */
  rfq: PublicKey;
  /** The response address */
  response: PublicKey;

  /*
   * Args
   */

  side: AuthoritySide;

  legAmountToPrepare: number;

  baseAssetMints: Mint[];
};

/**
 * @group Operations
 * @category Outputs
 */
export type PrepareMoreLegsSettlementOutput = {
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const prepareMoreLegsSettlementOperationHandler: OperationHandler<PrepareMoreLegsSettlementOperation> =
  {
    handle: async (
      operation: PrepareMoreLegsSettlementOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<PrepareMoreLegsSettlementOutput> => {
      const builder = await prepareMoreLegsSettlementBuilder(
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

      return output;
    },
  };

export type PrepareMoreLegsSettlementBuilderParams =
  PrepareMoreLegsSettlementInput;

/**
 * Prepares more legs settlement
 *
 * ```ts
 * const transactionBuilder = await convergence
 *   .rfqs()
 *   .builders()
 *   .prepareMoreLegsSettlement();
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const prepareMoreLegsSettlementBuilder = async (
  convergence: Convergence,
  params: PrepareMoreLegsSettlementBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<TransactionBuilder> => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const rfqProgram = convergence.programs().getRfq(programs);
  const systemProgram = convergence.programs().getSystem(programs);

  const {
    caller = convergence.identity(),
    rfq,
    response,
    side,
    legAmountToPrepare,
    baseAssetMints,
  } = params;

  const protocol = await convergence.protocol().get();

  const anchorRemainingAccounts: AccountMeta[] = [];

  const rfqModel = await convergence.rfqs().findRfqByAddress({ address: rfq });
  const responseModel = await convergence
    .rfqs()
    .findResponseByAddress({ address: response });

  const sidePreparedLegs: number =
    side == AuthoritySide.Taker
      ? parseInt(responseModel.takerPreparedLegs.toString())
      : parseInt(responseModel.makerPreparedLegs.toString());

  let j = 0;
  for (
    let i = sidePreparedLegs;
    i < sidePreparedLegs + legAmountToPrepare;
    i++
  ) {
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
        pubkey: caller.publicKey,
        isSigner: true,
        isWritable: true,
      },
      {
        pubkey: await getAssociatedTokenAddress(
          baseAssetMints[j].address,
          caller.publicKey,
          undefined,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        ),
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: baseAssetMints[j].address,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: instrumentEscrowPda,
        isSigner: false,
        isWritable: true,
      },
      { pubkey: systemProgram.address, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ];
    anchorRemainingAccounts.push(instrumentProgramAccount, ...legAccounts);

    j++;
  }

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .add({
      instruction: createPrepareMoreLegsSettlementInstruction(
        {
          caller: caller.publicKey,
          protocol: protocol.address,
          rfq,
          response,
          anchorRemainingAccounts,
        },
        {
          side,
          legAmountToPrepare,
        },
        rfqProgram.address
      ),
      signers: [caller],
      key: 'prepareMoreLegsSettlement',
    });
};
