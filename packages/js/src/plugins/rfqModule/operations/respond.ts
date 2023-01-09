import { createRespondToRfqInstruction, Quote, BaseAssetIndex } from '@convergence-rfq/rfq';
import { PublicKey, Keypair, AccountMeta } from '@solana/web3.js';
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
  },
};

/**
 * @group Transaction Builders
 * @category Inputs
 */
export type RespondBuilderParams = RespondInput;

function toLittleEndian(value: number, bytes: number) {
  const buf = Buffer.allocUnsafe(bytes);
  buf.writeUIntLE(value, 0, bytes);
  return buf;
}

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
  const { programs, /*payer = convergence.rpc().getDefaultFeePayer()*/ } = options;
  const { maker = convergence.identity(), keypair = Keypair.generate(), baseAssetIndex = { value: 0 } } = params;

  const protocol = await convergence.protocol().get();

  // const systemProgram = convergence.programs().getSystem(programs);
  const rfqProgram = convergence.programs().getToken(programs);
  const riskEngineProgram = convergence.programs().getRiskEngine(programs);

  const [collateralInfoPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('collateral_info'), maker.publicKey.toBuffer()],
    rfqProgram.address
  );
  const [collateralTokenPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('collateral_token'), maker.publicKey.toBuffer()],
    rfqProgram.address
  );

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
    isWritable: true,
  };

  const [baseAsset] = PublicKey.findProgramAddressSync(
    [Buffer.from('base_asset'), toLittleEndian(baseAssetIndex.value, 2)],
    rfqProgram.address
  );

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
    rfq,
    collateralInfo = collateralInfoPda,
    collateralToken = collateralTokenPda,
    riskEngine = riskEngineProgram.address,
    bid,
    ask,
  } = params;

  anchorRemainingAccounts.push(
    configAccount,
    ...baseAssetAccounts,
    ...oracleAccounts
  );

  return TransactionBuilder.make()
    .setFeePayer(maker)
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
          anchorRemainingAccounts
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
