import { createRespondToRfqInstruction } from '@convergence-rfq/rfq';
import { PublicKey, Keypair, AccountMeta } from '@solana/web3.js';
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

const Key = 'RespondOperation' as const;

/**
 * Cancels an existing Rfq.
 *
 * ```ts
 * await convergence
 *   .rfqs()
 *   .respond({ ... };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const respondOperation = useOperation<RespondOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type RespondOperation = Operation<
  typeof Key,
  RespondInput,
  RespondOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type RespondInput = {
  /** The address of the Rfq account. */
  address: PublicKey;

  /**
   * The owner of the Rfq as a Signer.
   *
   * @defaultValue `convergence.identity()`
   */
  owner?: Signer;
};

/**
 * @group Operations
 * @category Outputs
 */
export type RespondOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const respondOperationHandler: OperationHandler<RespondOperation> = {
  handle: async (
    operation: RespondOperation,
    convergence: Convergence,
    scope: OperationScope
  ): Promise<RespondOutput> => {
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
export type RespondBuilderParams = Omit<RespondInput, 'confirmOptions'> & {
  /** A key to distinguish the instruction that burns the NFT. */
  instructionKey?: string;
};

/**
 * Cancels an existing Rfq.
 *
 * ```ts
 * const transactionBuilder = convergence
 *   .rfqs()
 *   .builders()
 *   .cancel({ address });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const respondBuilder = (
  convergence: Convergence,
  params: RespondBuilderParams,
  options: TransactionBuilderOptions = {}
): TransactionBuilder => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const { owner = convergence.identity() } = params;

  const rfqProgram = convergence.programs().getToken(programs);

  const maker = Keypair.generate().publicKey;
  const protocol = Keypair.generate().publicKey;
  const rfq = Keypair.generate().publicKey;
  const response = Keypair.generate().publicKey;
  const collateralInfo = Keypair.generate().publicKey;
  const collateralToken = Keypair.generate().publicKey;
  const riskEngine = Keypair.generate().publicKey;
  const systemProgram = Keypair.generate().publicKey;
  const anchorRemainingAccounts: AccountMeta[] = [];

  //const ask = {
  //  Standart: {
  //    priceQuote: 1,
  //    legsMultiplierBps: 1,
  //  },
  //};
  //const bid = {
  //  Standart: {
  //    priceQuote: 1,
  //    legsMultiplierBps: 1,
  //  },
  //};

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .add({
      instruction: createRespondToRfqInstruction(
        {
          maker,
          protocol,
          rfq,
          response,
          collateralInfo,
          collateralToken,
          riskEngine,
          systemProgram,
          anchorRemainingAccounts,
        },
        {
          bid: null,
          ask: null,
        },
        rfqProgram.address
      ),
      signers: [owner],
      key: params.instructionKey ?? 'respondRfq',
    });
};
