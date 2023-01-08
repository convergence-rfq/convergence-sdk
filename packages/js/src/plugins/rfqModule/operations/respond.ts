import { createRespondToRfqInstruction, Quote } from '@convergence-rfq/rfq';
import { PublicKey, Keypair } from '@solana/web3.js';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { Convergence } from '@/Convergence';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
  Signer,
  makeConfirmOptionsFinalizedOnMainnet,
} from '@/types';
import { TransactionBuilder, TransactionBuilderOptions, Option } from '@/utils';

const Key = 'RespondOperation' as const;

/**
 * Responds to an Rfq.
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
  /**
   * The maker of the Rfq as a Signer.
   *
   * @defaultValue `convergence.identity()`
   */
  maker?: Signer;
  /** The address of the protocol account. */
  protocol?: PublicKey;
  /** The address of the Rfq account. */
  rfq: PublicKey;
  
  // /** The address of the response account. */
  // response: PublicKey;

  /** Optional Rfq keypair */
  keypair?: Keypair;

  /** The address of the Maker's collateral_info account. */
  collateralInfo: PublicKey;
  /** The address of the Maker's collateral_token account. */
  collateralToken: PublicKey;
  /** The address of the risk_engine account. */
  riskEngine: PublicKey;
  /** The optional Bid side */
  bid: Option<Quote>;
  /** The optional Ask side */
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
export const respondOperationHandler: OperationHandler<RespondOperation> = {
  handle: async (
    operation: RespondOperation,
    convergence: Convergence,
    scope: OperationScope
  ): Promise<RespondOutput> => {
    // const { keypair = Keypair.generate() } = operation.input;

    const builder = await respondBuilder(
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
    // return RespondBuilder(convergence, operation.input, scope).sendAndConfirm(
    //   convergence,
    //   scope.confirmOptions
    // );
  },
};

/**
 * @group Transaction Builders
 * @category Inputs
 */
export type RespondBuilderParams = RespondInput;

/**
 * Responds to an Rfq.
 *
 * ```ts
 * const transactionBuilder = convergence
 *   .rfqs()
 *   .builders()
 *   .respond({ address });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const respondBuilder = async (
  convergence: Convergence,
  params: RespondBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<TransactionBuilder> => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const { keypair = Keypair.generate() } = params;

  const {
    maker = convergence.identity(),
    rfq,
    collateralInfo,
    collateralToken,
    riskEngine,
    bid = null,
    ask = null,
  } = params;

  const protocol = await convergence.protocol().get();

  const systemProgram = convergence.programs().getSystem(programs);
  const rfqProgram = convergence.programs().getToken(programs);

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .add({
      instruction: createRespondToRfqInstruction(
        {
          maker: maker.publicKey,
          protocol: protocol.address,
          rfq,
          response: keypair.publicKey,
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
      signers: [maker, keypair],
      key: 'respond',
    });
};
