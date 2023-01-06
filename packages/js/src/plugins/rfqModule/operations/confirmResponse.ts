import { createConfirmResponseInstruction, Side } from '@convergence-rfq/rfq';
import { PublicKey } from '@solana/web3.js';
import { bignum, COption } from '@metaplex-foundation/beet';
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

const Key = 'ConfirmResponseOperation' as const;

/**
 * Confirms a response.
 *
 * ```ts
 * await convergence
 *   .rfqs()
 *   .confirmResponse({ ... };
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
  /**
   * The taker of the Rfq as a Signer
   *
   * @defaultValue `convergence.identity()`
   */
  taker?: Signer;
  /** The address of the protocol */
  protocol: PublicKey;
  /** The address of the Rfq account. */
  rfq: PublicKey;
  /** The address of the response */
  response: PublicKey;
  /** The address of the Taker's collateral info account */
  collateralInfo: PublicKey;
  /** The address of the Maker's collateral info account */
  makerCollateralInfo: PublicKey;
  /** The address of the collateral token */
  collateralToken: PublicKey;
  /** The address of the risk engine */
  riskEngine: PublicKey;

  /** The side */
  side: Side;
  /** ??? */
  overrideLegMultiplierBps: COption<bignum>;
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
      return confirmResponseBuilder(
        convergence,
        operation.input,
        scope
      ).sendAndConfirm(convergence, scope.confirmOptions);
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
export const confirmResponseBuilder = (
  convergence: Convergence,
  params: ConfirmResponseBuilderParams,
  options: TransactionBuilderOptions = {}
): TransactionBuilder => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const {
    taker = convergence.identity(),
    protocol,
    rfq,
    response,
    collateralInfo,
    makerCollateralInfo,
    collateralToken,
    riskEngine,
    side,
    overrideLegMultiplierBps,
  } = params;

  const rfqProgram = convergence.programs().getToken(programs);

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .add({
      instruction: createConfirmResponseInstruction(
        {
          taker: taker.publicKey,
          protocol,
          rfq,
          response,
          collateralInfo,
          makerCollateralInfo,
          collateralToken,
          riskEngine,
        },
        {
          side,
          overrideLegMultiplierBps,
        },
        rfqProgram.address
      ),
      signers: [taker],
      key: 'confirmResponse',
    });
};
