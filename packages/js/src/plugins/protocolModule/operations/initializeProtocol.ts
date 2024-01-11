import {
  createInitializeProtocolInstruction,
  FeeParameters,
} from '@convergence-rfq/rfq';
import { ComputeBudgetProgram, PublicKey } from '@solana/web3.js';

import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { assertProtocol, Protocol } from '../models';
import {
  TransactionBuilder,
  TransactionBuilderOptions,
} from '../../../utils/TransactionBuilder';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '../../../types';
import { Convergence } from '../../../Convergence';
import { addDecimals } from '../../../utils/conversions';
import { TRANSACTION_PRIORITY_FEE_MAP } from '@/constants';

const Key = 'InitializeProtocolOperation' as const;

/**
 * Initialize a new protocol. Note the PDA is derived from a seed, meaning
 * only one protocol can be initialized per network.
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
   * The protocol collateral token mint.
   */
  collateralMint: PublicKey;

  /**
   * The protocol maker fee.
   */
  protocolMakerFee?: number;

  /**
   * The protocol taker fee.
   */
  protocolTakerFee?: number;

  /**
   * The protocol settlement maker fee.
   */
  settlementMakerFee?: number;

  /**
   * The protocol settlement taker fee.
   */
  settlementTakerFee?: number;
};

/**
 * @group Operations
 * @category Outputs
 */
export type InitializeProtocolOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;

  /** The newly initialized protocol. */
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

      const output = await builder.sendAndConfirm(
        convergence,
        scope.confirmOptions
      );
      scope.throwIfCanceled();

      const protocol = await convergence.protocol().get({});
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
  const {
    collateralMint,
    protocolMakerFee = 0,
    protocolTakerFee = 0,
    settlementTakerFee = 0,
    settlementMakerFee = 0,
  } = params;

  const systemProgram = convergence.programs().getSystem(programs);
  const rfqProgram = convergence.programs().getRfq();
  const riskEngineProgram = convergence.programs().getRiskEngine();

  const protocol = convergence.protocol().pdas().protocol();
  const collateralMintTokenAccount = await convergence
    .tokens()
    .findMintByAddress({ address: collateralMint });

  const settleFees: FeeParameters = {
    takerBps: addDecimals(
      settlementTakerFee,
      collateralMintTokenAccount.decimals
    ),
    makerBps: addDecimals(
      settlementMakerFee,
      collateralMintTokenAccount.decimals
    ),
  };
  const defaultFees: FeeParameters = {
    takerBps: addDecimals(
      protocolTakerFee,
      collateralMintTokenAccount.decimals
    ),
    makerBps: addDecimals(
      protocolMakerFee,
      collateralMintTokenAccount.decimals
    ),
  };

  return TransactionBuilder.make<InitializeProtocolBuilderContext>()
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
