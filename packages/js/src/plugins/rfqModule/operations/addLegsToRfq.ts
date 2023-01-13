import { createAddLegsToRfqInstruction, Leg } from '@convergence-rfq/rfq';
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
import { ProtocolPdasClient } from '@/plugins/protocolModule';
const Key = 'AddLegsToRfqOperation' as const;

/**
 * Adds Legs to an existing Rfq.
 *
 * ```ts
 * await convergence
 *   .rfqs()
 *   .addLegsTo({ address };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const addLegsToRfqOperation = useOperation<AddLegsToRfqOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type AddLegsToRfqOperation = Operation<
  typeof Key,
  AddLegsToRfqInput,
  AddLegsToRfqOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type AddLegsToRfqInput = {
  /**
   * The owner of the Rfq as a Signer.
   *
   * @defaultValue `convergence.identity()`
   */
  taker?: Signer;

  rfq: PublicKey;

  /*
   * Args
   */

  legs: Leg[];
};

/**
 * @group Operations
 * @category Outputs
 */
export type AddLegsToRfqOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const addLegsToRfqOperationHandler: OperationHandler<AddLegsToRfqOperation> =
  {
    handle: async (
      operation: AddLegsToRfqOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<AddLegsToRfqOutput> => {
      scope.throwIfCanceled();

      return addLegsToRfqBuilder(
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
export type AddLegsToRfqBuilderParams = AddLegsToRfqInput;

/**
 * Adds Legs to an existing Rfq.
 *
 * ```ts
 * const transactionBuilder = convergences
 *   .rfqs()
 *   .builders()
 *   .addLegsTo({ address });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const addLegsToRfqBuilder = (
  convergence: Convergence,
  params: AddLegsToRfqBuilderParams,
  options: TransactionBuilderOptions = {}
): TransactionBuilder => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const protocolPdaClient = new ProtocolPdasClient(convergence);
  const protocol = protocolPdaClient.protocol();
  const { taker = convergence.identity(), rfq, legs } = params;

  const rfqProgram = convergence.programs().getRfq(programs);

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .add({
      instruction: createAddLegsToRfqInstruction(
        {
          taker: taker.publicKey,
          protocol,
          rfq,
        },
        {
          legs,
        },
        rfqProgram.address
      ),
      signers: [taker],
      key: 'addLegsToRfq',
    });
};
