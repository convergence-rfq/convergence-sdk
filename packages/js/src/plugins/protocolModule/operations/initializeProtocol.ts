import {
  createInitializeProtocolInstruction,
  FeeParameters,
} from '@convergence-rfq/rfq';
import { PublicKey } from '@solana/web3.js';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { assertProtocol, Protocol } from '../models';
import { TransactionBuilder, TransactionBuilderOptions } from '@/utils';
import {
  makeConfirmOptionsFinalizedOnMainnet,
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '@/types';
import { Convergence } from '@/Convergence';

const Key = 'InitializeProtocolOperation' as const;

/**
 * Initialize a new protocol.
 *
 * ```ts
 * const { protocol } = await convergence
 *   .protocol()
 *   .initialize();
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const initializeProtocolOperation =
  useOperation<InitializeProtocolOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type InitializeProtocolOperation = Operation<
  typeof Key,
  InitializeProtocolInput,
  InitializeProtocolOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type InitializeProtocolInput = {
  /**
   * The owner of the Rfq to create.
   *
   * @defaultValue `convergence.identity().publicKey`
   */
  owner?: PublicKey;

  /**
   * The protocol risk engine.
   */
  riskEngine: PublicKey;

  /**
   * The protocol collateral token mint.
   */
  collateralMint: PublicKey;
};

/**
 * @group Operations
 * @category Outputs
 */
export type InitializeProtocolOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;

  /** The newly created Rfq. */
  protocol: Protocol;
};

/**
 * @group Operations
 * @category Handlers
 */
export const initializeProtocolOperationHandler: OperationHandler<InitializeProtocolOperation> =
  {
    handle: async (
      operation: InitializeProtocolOperation,
      convergence: Convergence,
      scope: OperationScope
    ) => {
      const { owner = convergence.identity().publicKey } = operation.input;

      const builder = await createProtocolBuilder(
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

      const protocol = await convergence.rfqs().findByAddress(
        {
          addresses: [],
        },
        scope
      );
      scope.throwIfCanceled();

      assertProtocol(protocol);

      return { ...output, protocol };
    },
  };

/**
 * @group Transaction Builders
 * @category Inputs
 */
export type CreateProtocolBuilderParams = Omit<
  InitializeProtocolInput,
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
export type InitializeProtocolBuilderContext = Omit<
  InitializeProtocolOutput,
  'protocol'
>;

/**
 * Creates a new Protocol.
 *
 * ```ts
 * const transactionBuilder = await convergence
 *   .protocol()
 *   .builders()
 *   .create();
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const createProtocolBuilder = async (
  convergence: Convergence,
  params: CreateProtocolBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<TransactionBuilder<InitializeProtocolBuilderContext>> => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const { riskEngine, collateralMint } = params;

  const systemProgram = convergence.programs().getSystem(programs);
  const rfqProgram = convergence.programs().getRfq(programs);

  const [protocol] = await PublicKey.findProgramAddress(
    [Buffer.from('protocol')],
    rfqProgram.address
  );

  const settleFees: FeeParameters = { takerBps: 0, makerBps: 0 };
  const defaultFees: FeeParameters = { takerBps: 0, makerBps: 0 };

  return TransactionBuilder.make<InitializeProtocolBuilderContext>()
    .setFeePayer(payer)
    .add({
      instruction: createInitializeProtocolInstruction(
        {
          protocol,
          signer: payer.publicKey,
          riskEngine,
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
