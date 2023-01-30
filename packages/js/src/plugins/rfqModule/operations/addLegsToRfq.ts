import { createAddLegsToRfqInstruction } from '@convergence-rfq/rfq';
import { PublicKey, AccountMeta } from '@solana/web3.js';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { SpotInstrument } from '../../spotInstrumentModule';
import { PsyoptionsEuropeanInstrument } from '../../psyoptionsEuropeanInstrumentModule';
import { Leg } from '../types';
import { Convergence } from '@/Convergence';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
  Signer,
  makeConfirmOptionsFinalizedOnMainnet,
} from '@/types';
import { TransactionBuilder, TransactionBuilderOptions } from '@/utils';
import { PsyoptionsAmericanInstrument } from '@/plugins/psyoptionsAmericanInstrumentModule';
const Key = 'AddLegsToRfqOperation' as const;

/**
 * Adds Legs to an existing Rfq.
 *
 * ```ts
 * await convergence
 *   .rfqs()
 *   .addLegsToRfq({ taker, rfq, instruments };
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

  instruments: (
    | SpotInstrument
    | PsyoptionsEuropeanInstrument
    | PsyoptionsAmericanInstrument
  )[];
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
      const builder = await addLegsToRfqBuilder(
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
export type AddLegsToRfqBuilderParams = AddLegsToRfqInput;

/**
 * Adds Legs to an existing Rfq.
 *
 * ```ts
 * const transactionBuilder = convergences
 *   .rfqs()
 *   .builders()
 *   .addLegsToRfq({ address });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const addLegsToRfqBuilder = async (
  convergence: Convergence,
  params: AddLegsToRfqBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<TransactionBuilder> => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const protocolPdaClient = convergence.protocol().pdas();
  const protocol = protocolPdaClient.protocol();
  const { taker = convergence.identity(), rfq, instruments } = params;

  const rfqProgram = convergence.programs().getRfq(programs);

  const legAccounts: AccountMeta[] = [];
  const legs: Leg[] = [];

  for (const instrument of instruments) {
    const instrumentClient = convergence.instrument(
      instrument,
      instrument.legInfo
    );
    legs.push(await instrumentClient.toLegData());
    legAccounts.push(...instrumentClient.getValidationAccounts());
  }
  return TransactionBuilder.make()
    .setFeePayer(payer)
    .add({
      instruction: createAddLegsToRfqInstruction(
        {
          taker: taker.publicKey,
          protocol,
          rfq,
          anchorRemainingAccounts: legAccounts,
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
