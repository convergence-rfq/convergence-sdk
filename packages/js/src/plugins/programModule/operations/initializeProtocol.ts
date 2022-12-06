import { PublicKey } from '@solana/web3.js';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
  Signer,
} from '@/types';
import { Convergence } from '@/Convergence';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { TransactionBuilder, TransactionBuilderOptions } from '@/utils';
import { makeConfirmOptionsFinalizedOnMainnet } from '@/types';
import {
  createInitializeProtocolInstruction,
  FeeParameters,
} from '@convergence-rfq/rfq';

const Key = 'InitializeProtocolOperation' as const;

/**
 * Initializes the protocol
 *
 * ```ts
 * const rfq = await convergence
 *   .rfqs()
 *   .initializeProtocol({ address };
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
   * The Signer to initialize protocol
   *
   * @defaultValue `convergence.identity().publicKey`
   */
  signer?: Signer;
  /** The protocol address */
  protocol: PublicKey;
  /** The riskEngine address */
  riskEngine: PublicKey;
  /** The collateral token mint address */
  collateralMint: PublicKey;

  /*
   * Args
   */

  settleFees: FeeParameters;

  defaultFees: FeeParameters;
};

/**
 * @group Operations
 * @category Outputs
 */
export type InitializeProtocolOutput = {
  response: SendAndConfirmTransactionResponse;
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
    ): Promise<InitializeProtocolOutput> => {
      const builder = initializeProtocolBuilder(
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

      return output;
    },
  };

export type InitializeProtocolBuilderParams = InitializeProtocolInput;

/**
 * Initializes the protocol
 *
 * ```ts
 * const transactionBuilder = await convergence
 *   .rfqs()
 *   .builders()
 *   .initializeProtocol();
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const initializeProtocolBuilder = (
  convergence: Convergence,
  params: InitializeProtocolBuilderParams,
  options: TransactionBuilderOptions = {}
): TransactionBuilder => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const rfqProgram = convergence.programs().getRfq(programs);
  const systemProgram = convergence.programs().getSystem(programs);

  const {
    signer = convergence.identity(),
    protocol,
    riskEngine,
    collateralMint,
    settleFees,
    defaultFees,
  } = params;

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .add({
      instruction: createInitializeProtocolInstruction(
        {
          signer: signer.publicKey,
          protocol,
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
