import {
  createPrepareSettlementInstruction,
  AuthoritySide,
} from '@convergence-rfq/rfq';
import { PublicKey } from '@solana/web3.js';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { Convergence } from '@/Convergence';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
  Signer,
} from '@/types';
import { TransactionBuilder, TransactionBuilderOptions } from '@/utils';

const Key = 'PrepareSettlementOperation' as const;

/**
 * Prepares for settlement.
 *
 * ```ts
 * await convergence
 *   .rfqs()
 *   .prepareSettlement({ ... };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const prepareSettlementOperation =
  useOperation<PrepareSettlementOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type PrepareSettlementOperation = Operation<
  typeof Key,
  PrepareSettlementInput,
  PrepareSettlementOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type PrepareSettlementInput = {
  /**
   * The caller to prepare settlement of the Rfq
   *
   * @defaultValue `convergence.identity()`
   */
  caller?: Signer;
  /** The address of quoteToken Token account */
  quoteTokens: PublicKey;
  /** The address of the protocol */
  protocol: PublicKey;
  /** The address of the Rfq account */
  rfq: PublicKey;
  /** The address of the response account */
  response: PublicKey;
  /** The Mint address of the quote token */
  quoteMint: PublicKey;
  /** The address of the quote escrow TokenAccount */
  quoteEscrow: PublicKey;
  /** The rent sysvar */
  rent?: PublicKey;

  /*
   * Args
   */

  side: AuthoritySide;

  legAmountToPrepare: number;
};

/**
 * @group Operations
 * @category Outputs
 */
export type PrepareSettlementOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const prepareSettlementOperationHandler: OperationHandler<PrepareSettlementOperation> =
  {
    handle: async (
      operation: PrepareSettlementOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<PrepareSettlementOutput> => {
      return respondBuilder(convergence, operation.input, scope).sendAndConfirm(
        convergence,
        scope.confirmOptions
      );
    },
  };

/**
 * @group Transaction Builders
 * @category Inputs
 */
export type PrepareSettlementBuilderParams = PrepareSettlementInput;

/**
 * Prepares for settlement
 *
 * ```ts
 * const transactionBuilder = convergence
 *   .rfqs()
 *   .builders()
 *   .prepareSettlement({ address });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const respondBuilder = (
  convergence: Convergence,
  params: PrepareSettlementBuilderParams,
  options: TransactionBuilderOptions = {}
): TransactionBuilder => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const {
    caller = convergence.identity(),
    // quoteTokens,
    protocol,
    rfq,
    response,
    // quoteMint,
    // quoteEscrow,
    // rent = SYSVAR_RENT_PUBKEY,
    side,
    legAmountToPrepare,
  } = params;

  const rfqProgram = convergence.programs().getToken(programs);
  // const systemProgram = convergence.programs().getSystem(programs);
  // const tokenProgram = convergence.programs().getToken(programs);

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .add({
      instruction: createPrepareSettlementInstruction(
        {
          caller: caller.publicKey,
          // quoteTokens,
          protocol,
          rfq,
          response,
          // quoteMint,
          // quoteEscrow,
          // systemProgram: systemProgram.address,
          // tokenProgram: tokenProgram.address,
          // rent,
        },
        {
          side,
          legAmountToPrepare,
        },
        rfqProgram.address
      ),
      signers: [caller],
      key: 'prepareSettlement',
    });
};
