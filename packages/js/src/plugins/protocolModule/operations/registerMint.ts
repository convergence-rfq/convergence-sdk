import { createRegisterMintInstruction } from '@convergence-rfq/rfq';
import { PublicKey } from '@solana/web3.js';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { TransactionBuilder, TransactionBuilderOptions } from '@/utils';
import {
  makeConfirmOptionsFinalizedOnMainnet,
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
  Signer,
} from '@/types';
import { Convergence } from '@/Convergence';

const Key = 'RegisterMintOperation' as const;

/**
 * Registers a mint
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
export const registerMintOperation = useOperation<RegisterMintOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type RegisterMintOperation = Operation<
  typeof Key,
  RegisterMintInput,
  RegisterMintOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type RegisterMintInput = {
  /**
   * The owner of the protocol.
   */
  authority: Signer;

  /**
   * The protocol to add the instrument to.
   */
  protocol: PublicKey;

  /**
   * The protocol collateral token mint.
   */
  mint: PublicKey;
};

/**
 * @group Operations
 * @category Outputs
 */
export type RegisterMintOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const registerMintOperationHandler: OperationHandler<RegisterMintOperation> =
  {
    handle: async (
      operation: RegisterMintOperation,
      convergence: Convergence,
      scope: OperationScope
    ) => {
      //   const { owner = convergence.identity().publicKey } = operation.input;

      const builder = await registerMintBuilder(
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

export function toLittleEndian(value: number, bytes: number) {
  const buf = Buffer.allocUnsafe(bytes);
  buf.writeUIntLE(value, 0, bytes);
  return buf;
}

/**
 * @group Transaction Builders
 * @category Inputs
 */
export type RegisterMintBuilderParams = RegisterMintInput;

/**
 * @group Transaction Builders
 * @category Contexts
 */
export type RegisterMintBuilderContext = RegisterMintOutput;

/**
 * Registers a mint.
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
export const registerMintBuilder = async (
  convergence: Convergence,
  params: RegisterMintBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<TransactionBuilder<RegisterMintBuilderContext>> => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const { authority = convergence.identity(), mint } = params;

  const systemProgram = convergence.programs().getSystem(programs);
  const rfqProgram = convergence.programs().getRfq();

  const [protocol] = PublicKey.findProgramAddressSync(
    [Buffer.from('protocol')],
    rfqProgram.address
  );

  const [mintInfo] = PublicKey.findProgramAddressSync(
    [Buffer.from('mint_info'), mint.toBuffer()],
    rfqProgram.address
  );

  const baseAssetIndex = 0;
  const [baseAsset] = PublicKey.findProgramAddressSync(
    [Buffer.from('base_asset'), toLittleEndian(baseAssetIndex, 2)],
    rfqProgram.address
  );

  return TransactionBuilder.make<RegisterMintBuilderContext>()
    .setFeePayer(payer)
    .add({
      instruction: createRegisterMintInstruction(
        {
          authority: authority.publicKey,
          protocol,
          mintInfo,
          baseAsset,
          mint,
          systemProgram: systemProgram.address,
        },
        rfqProgram.address
      ),
      signers: [payer],
      key: 'registerMint',
    });
};

//   type RegisterMintInstructionAccounts = {
//     authority: web3.PublicKey;
//     protocol: web3.PublicKey;
//     mintInfo: web3.PublicKey;
//     baseAsset: web3.PublicKey;
//     mint: web3.PublicKey;
//     systemProgram?: web3.PublicKey | undefined;
//     anchorRemainingAccounts?: web3.AccountMeta[] | undefined;
// }
