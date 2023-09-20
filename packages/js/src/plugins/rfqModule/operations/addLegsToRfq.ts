import { createAddLegsToRfqInstruction } from '@convergence-rfq/rfq';
import { PublicKey } from '@solana/web3.js';

import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { instrumentsToLegAccounts, instrumentsToLegs } from '../helpers';
import { Convergence } from '../../../Convergence';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
  Signer,
} from '../../../types';
import {
  TransactionBuilder,
  TransactionBuilderOptions,
} from '../../../utils/TransactionBuilder';
import { LegInstrument } from '../../../plugins/instrumentModule';

const Key = 'AddLegsToRfqOperation' as const;

/**
 * Adds Legs to an existing Rfq.
 *
 * ```ts
 * await convergence
 *   .rfqs()
 *   .addLegsToRfq({
 *     rfq: <publicKey>,
 *     instruments: [
 *       await SpotLegInstrument.create(convergence, baseMint, amount, 'bid'),
 *     ],
 *   });
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
  /** The address of the Rfq account. */
  rfq: PublicKey;

  /**
   * The owner of the Rfq as a Signer.
   *
   * @defaultValue `convergence.identity()`
   */
  taker?: Signer;

  /** The instruments of the order, used to construct legs. */
  instruments: LegInstrument[];
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
      const output = await builder.sendAndConfirm(
        convergence,
        scope.confirmOptions
      );
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
 *   .addLegsToRfq();
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
  const { taker = convergence.identity(), instruments, rfq } = params;

  const legs = instrumentsToLegs(instruments);
  const legAccounts = await instrumentsToLegAccounts(instruments);

  const baseAssetAccounts = await Promise.all(
    instruments.map((instrument) => instrument.getBaseAssetAccount())
  );

  const rfqProgram = convergence.programs().getRfq(programs);

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .add({
      instruction: createAddLegsToRfqInstruction(
        {
          taker: taker.publicKey,
          protocol,
          rfq,
          anchorRemainingAccounts: [...baseAssetAccounts, ...legAccounts],
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
