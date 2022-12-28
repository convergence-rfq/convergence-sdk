import {
  createInitializeProtocolInstruction,
  FeeParameters,
} from '@convergence-rfq/rfq';
import { PublicKey } from '@solana/web3.js';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { TransactionBuilder, TransactionBuilderOptions } from '@/utils';
import {
  makeConfirmOptionsFinalizedOnMainnet,
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '@/types';
import { Convergence } from '@/Convergence';

const Key = 'InitializePsyoptionsEuropeanInstrumentOperation' as const;

/**
 * Initialize a new protocol. Note the PDA is derived from a seed, meaning
 * only one protocol can be initialized per network.
 *
 * ```ts
 * const { protocol } = await convergence
 *   .psyoptionsEuropeanInstrument()
 *   .initialize();
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const initializePsyoptionsEuropeanInstrumentOperation =
  useOperation<InitializePsyoptionsEuropeanInstrumentOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type InitializePsyoptionsEuropeanInstrumentOperation = Operation<
  typeof Key,
  InitializePsyoptionsEuropeanInstrumentInput,
  InitializePsyoptionsEuropeanInstrumentOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type InitializePsyoptionsEuropeanInstrumentInput = {
  /**
   * The owner of the Rfq to create.
   *
   * @defaultValue `convergence.identity().publicKey`
   */
  owner?: PublicKey;

  /**
   * The protocol collateral token mint.
   */
  collateralMint: PublicKey;
};

/**
 * @group Operations
 * @category Outputs
 */
export type InitializePsyoptionsEuropeanInstrumentOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;

  /** The newly initialized Psyoptions European instrument. */
  //psyoptionsEuropeanInstrument: PsyoptionsEuropeanInstrument;
};

/**
 * @group Operations
 * @category Handlers
 */
export const initializePsyoptionsEuropeanInstrumentOperationHandler: OperationHandler<InitializePsyoptionsEuropeanInstrumentOperation> =
  {
    handle: async (
      operation: InitializePsyoptionsEuropeanInstrumentOperation,
      convergence: Convergence,
      scope: OperationScope
    ) => {
      const { owner = convergence.identity().publicKey } = operation.input;

      const builder = await createPsyoptionsEuropeanInstrumentBuilder(
        convergence,
        {
          ...operation.input,
          owner,
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
export type InitializePsyoptionsEuropeanInstrumentBuilderParams = Omit<
  InitializePsyoptionsEuropeanInstrumentInput,
  'confirmOptions'
> & {
  /**
   * Whether or not the provided token account already exists.
   * If `false`, we'll add another instruction to create it.
   *
   * @defaultValue `true`
   */
  owner?: PublicKey;
};

/**
 * @group Transaction Builders
 * @category Contexts
 */
export type InitializePsyoptionsEuropeanInstrumentBuilderContext = Omit<
  InitializePsyoptionsEuropeanInstrumentOutput,
  'psyoptionsEuropeanInstrument'
>;

/**
 * Creates a new Psyoptions European instrument.
 *
 * ```ts
 * const transactionBuilder = await convergence
 *   .psyoptionsEuropeanInstrument()
 *   .builders()
 *   .create();
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const createPsyoptionsEuropeanInstrumentBuilder = async (
  convergence: Convergence,
  params: InitializePsyoptionsEuropeanInstrumentBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<
  TransactionBuilder<InitializePsyoptionsEuropeanInstrumentBuilderContext>
> => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const { collateralMint } = params;

  const systemProgram = convergence.programs().getSystem(programs);
  const rfqProgram = convergence.programs().getRfq();
  const riskEngineProgram = convergence.programs().getRiskEngine();

  // TODO: Swap out with a real PDA client, also, is there a way to get this from Solita?
  const [protocol] = await PublicKey.findProgramAddress(
    [Buffer.from('protocol')],
    rfqProgram.address
  );

  // TODO: Make this configurable
  const settleFees: FeeParameters = { takerBps: 0, makerBps: 0 };
  const defaultFees: FeeParameters = { takerBps: 0, makerBps: 0 };

  return TransactionBuilder.make<InitializePsyoptionsEuropeanInstrumentBuilderContext>()
    .setFeePayer(payer)
    .add({
      instruction: createInitializeProtocolInstruction(
        {
          protocol,
          signer: payer.publicKey,
          riskEngine: riskEngineProgram.address,
          collateralMint,
          systemProgram: systemProgram.address,
        },
        {
          settleFees,
          defaultFees,
        },
        rfqProgram.address
      ),
      signers: [payer],
      key: 'initializeProtocol',
    });
};
