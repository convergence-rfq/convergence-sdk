import {
  createRespondToRfqInstruction,
  Quote,
  BaseAssetIndex,
} from '@convergence-rfq/rfq';
import {
  PublicKey,
  Keypair,
  AccountMeta,
  ComputeBudgetProgram,
} from '@solana/web3.js';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { assertResponse, Response } from '../models/Response';
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

const Key = 'RespondToRfqOperation' as const;

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
export const respondToRfqOperation = useOperation<RespondToRfqOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type RespondToRfqOperation = Operation<
  typeof Key,
  RespondToRfqInput,
  RespondToRfqOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type RespondToRfqInput = {
  /**
   * The maker of the Response as a Signer.
   */
  maker?: Signer;
  /** The address of the protocol account. */
  protocol?: PublicKey;
  /** The address of the Rfq account. */
  rfq: PublicKey;
  /** Optional Response keypair */
  keypair?: Keypair;
  /** The address of the Maker's collateral_info account. */
  collateralInfo?: PublicKey;
  /** The address of the Maker's collateral_token account. */
  collateralToken?: PublicKey;
  /** The address of the risk_engine account. */
  riskEngine?: PublicKey;
  /** The optional Bid side */
  bid: Option<Quote>;
  /** The optional Ask side */
  ask: Option<Quote>;
  /** The base asset index. */
  baseAssetIndex?: BaseAssetIndex;
};

/**
 * @group Operations
 * @category Outputs
 */
export type RespondToRfqOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;

  /** The newly created Response. */
  rfqResponse: Response;
};

/**
 * @group Operations
 * @category Handlers
 */
export const respondToRfqOperationHandler: OperationHandler<RespondToRfqOperation> =
  {
    handle: async (
      operation: RespondToRfqOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<RespondToRfqOutput> => {
      const { keypair = Keypair.generate() } = operation.input;

      const builder = await respondToRfqBuilder(
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

      const rfqResponse = await convergence
        .rfqs()
        .findResponseByAddress({ address: keypair.publicKey });
      assertResponse(rfqResponse);

      return { ...output, rfqResponse };
    },
  };

/**
 * @group Transaction Builders
 * @category Inputs
 */
export type RespondToRfqBuilderParams = RespondToRfqInput;

// function toLittleEndian(value: number, bytes: number) {
//   const buf = Buffer.allocUnsafe(bytes);
//   buf.writeUIntLE(value, 0, bytes);
//   return buf;
// }

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
export const respondToRfqBuilder = async (
  convergence: Convergence,
  params: RespondToRfqBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<TransactionBuilder> => {
  const { programs } = options;
  const {
    rfq,
    maker = convergence.identity(),
    keypair = Keypair.generate(),
    baseAssetIndex = { value: 0 },
    bid,
    ask,
  } = params;

  const protocol = await convergence.protocol().get();

  const systemProgram = convergence.programs().getSystem(programs);
  const rfqProgram = convergence.programs().getRfq(programs);
  const riskEngineProgram = convergence.programs().getRiskEngine(programs);

  const collateralInfoPda = convergence.collateral().pdas().collateralInfo({
    user: maker.publicKey,
    programs,
  });
  const collateralTokenPda = convergence.collateral().pdas().collateralToken({
    user: maker.publicKey,
    programs,
  });

  const SWITCHBOARD_BTC_ORACLE = new PublicKey(
    '8SXvChNYFhRq4EZuZvnhjrB3jJRQCv4k3P4W6hesH3Ee'
  );

  const anchorRemainingAccounts: AccountMeta[] = [];

  const [config] = PublicKey.findProgramAddressSync(
    [Buffer.from('config')],
    riskEngineProgram.address
  );
  const configAccount: AccountMeta = {
    pubkey: config,
    isSigner: false,
    isWritable: false,
  };

  const baseAsset = convergence.rfqs().pdas().baseAsset({
    baseAssetIndexValue: baseAssetIndex.value,
    programs,
  });

  const baseAssetAccounts: AccountMeta[] = [
    {
      pubkey: baseAsset,
      isSigner: false,
      isWritable: false,
    },
  ];
  const oracleAccounts: AccountMeta[] = [
    {
      pubkey: SWITCHBOARD_BTC_ORACLE,
      isSigner: false,
      isWritable: false,
    },
  ];

  const {
    collateralInfo = collateralInfoPda,
    collateralToken = collateralTokenPda,
    riskEngine = riskEngineProgram.address,
  } = params;

  anchorRemainingAccounts.push(
    configAccount,
    ...baseAssetAccounts,
    ...oracleAccounts
  );

  return TransactionBuilder.make()
    .setFeePayer(maker)
    .setContext({
      keypair,
    })
    .add(
      {
        instruction: ComputeBudgetProgram.setComputeUnitLimit({
          units: 1400000,
        }),
        signers: [],
      },
      {
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
            anchorRemainingAccounts,
          },
          {
            bid,
            ask,
          },
          rfqProgram.address
        ),
        signers: [maker, keypair],
        key: 'respondToRfq',
      }
    );
};
