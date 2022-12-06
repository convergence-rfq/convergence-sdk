import { createRespondToRfqInstruction, Quote } from '@convergence-rfq/rfq';
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
import { TransactionBuilder, TransactionBuilderOptions, Option } from '@/utils';

const Key = 'RespondOperation' as const;

/**
 * Responds to an Rfq.
 *
 * ```ts
 * await convergence
 *   .rfqs()
 *   .Respond({ ... };
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
  /**
   * The maker of the Rfq as a Signer.
   *
   * @defaultValue `convergence.identity()`
   */
  maker?: Signer;

  protocol: PublicKey;

  /** The address of the Rfq account. */
  rfq: PublicKey;

  response: PublicKey;

  collateralInfo: PublicKey;

  collateralToken: PublicKey;

  riskEngine: PublicKey;

  bid: Option<Quote>;

  ask: Option<Quote>;
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
export const RespondOperationHandler: OperationHandler<RespondOperation> = {
  handle: async (
    operation: RespondOperation,
    convergence: Convergence,
    scope: OperationScope
  ): Promise<RespondOutput> => {
    return RespondBuilder(convergence, operation.input, scope).sendAndConfirm(
      convergence,
      scope.confirmOptions
    );
  },
};

/**
 * @group Transaction Builders
 * @category Inputs
 */
export type RespondBuilderParams = RespondInput;

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
export const RespondBuilder = (
  convergence: Convergence,
  params: RespondBuilderParams,
  options: TransactionBuilderOptions = {}
): TransactionBuilder => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const {
    maker = convergence.identity(),
    protocol,
    rfq,
    response,
    collateralInfo,
    collateralToken,
    riskEngine,
    bid = null,
    ask = null,
  } = params;

  const systemProgram = convergence.programs().getSystem(programs);
  const rfqProgram = convergence.programs().getToken(programs);

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .add({
      instruction: createRespondToRfqInstruction(
        {
          maker: maker.publicKey,
          protocol,
          rfq,
          response,
          collateralInfo,
          collateralToken,
          riskEngine,
          systemProgram: systemProgram.address,
        },
        {
          bid,
          ask,
        },
        rfqProgram.address
      ),
      signers: [maker],
      key: 'Respond',
    });
};
