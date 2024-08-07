import { createInitializeMintInstruction, MINT_SIZE } from '@solana/spl-token';
import { Keypair, PublicKey } from '@solana/web3.js';

import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { Mint } from '../models/Mint';
import {
  TransactionBuilder,
  TransactionBuilderOptions,
} from '../../../utils/TransactionBuilder';
import { Option } from '../../../utils/types';
import {
  makeConfirmOptionsFinalizedOnMainnet,
  Operation,
  OperationHandler,
  OperationScope,
  Signer,
  useOperation,
} from '../../../types';
import type { Convergence } from '../../../Convergence';

const Key = 'CreateMintOperation' as const;

/**
 * Creates a new mint account.
 *
 * ```ts
 * const { mint } = await convergence.tokens().createMint();
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const createMintOperation = useOperation<CreateMintOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type CreateMintOperation = Operation<
  typeof Key,
  CreateMintInput,
  CreateMintOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type CreateMintInput = {
  /**
   * The number of decimal points used to define token amounts.
   *
   * @defaultValue `0`
   */
  decimals?: number;

  /**
   * The address of the new mint account as a Signer.
   *
   * @defaultValue `Keypair.generate()`
   */
  mint?: Signer;

  /**
   * The address of the authority that is allowed
   * to mint new tokens to token accounts.
   *
   * @defaultValue `convergence.identity().publicKey`
   */
  mintAuthority?: PublicKey;

  /**
   * The address of the authority that is allowed
   * to freeze token accounts.
   *
   * @defaultValue Defaults to using the same value as the
   * `mintAuthority` parameter.
   */
  freezeAuthority?: Option<PublicKey>;
};

/**
 * Create a new Mint account from the provided input
 * and returns the newly created `Mint` model.
 *
 * @group Operations
 * @category Outputs
 */
export type CreateMintOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;

  /** The mint account as a Signer. */
  mintSigner: Signer;

  /** The created mint account. */
  mint: Mint;
};

/**
 * @group Operations
 * @category Handlers
 */
export const createMintOperationHandler: OperationHandler<CreateMintOperation> =
  {
    async handle(
      operation: CreateMintOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<CreateMintOutput> {
      const builder = await createMintBuilder(
        convergence,
        operation.input,
        scope
      );
      scope.throwIfCanceled();

      const confirmOptions = makeConfirmOptionsFinalizedOnMainnet(
        convergence,
        scope.confirmOptions
      );
      const output = await builder.sendAndConfirm(convergence, confirmOptions);
      scope.throwIfCanceled();

      const mint = await convergence
        .tokens()
        .findMintByAddress({ address: output.mintSigner.publicKey }, scope);

      return { ...output, mint };
    },
  };

// -----------------
// Builder
// -----------------

/**
 * @group Transaction Builders
 * @category Inputs
 */
export type CreateMintBuilderParams = Omit<
  CreateMintInput,
  'confirmOptions'
> & {
  /** A key to distinguish the instruction that creates the account. */
  createAccountInstructionKey?: string;

  /** A key to distinguish the instruction that initializes the mint account. */
  initializeMintInstructionKey?: string;
};

/**
 * @group Transaction Builders
 * @category Contexts
 */
export type CreateMintBuilderContext = Omit<
  CreateMintOutput,
  'response' | 'mint'
>;

/**
 * Creates a new mint account.
 *
 * ```ts
 * const transactionBuilder = await convergence.tokens().builders().createMint();
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const createMintBuilder = async (
  convergence: Convergence,
  params: CreateMintBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<TransactionBuilder<CreateMintBuilderContext>> => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const {
    decimals = 0,
    mint = Keypair.generate(),
    mintAuthority = convergence.identity().publicKey,
    freezeAuthority = mintAuthority,
  } = params;

  const tokenProgram = convergence.programs().getToken(programs);

  return (
    TransactionBuilder.make<CreateMintBuilderContext>()
      .setFeePayer(payer)
      .setContext({ mintSigner: mint })

      // Create an empty account for the mint.
      .add(
        await convergence
          .system()
          .builders()
          .createAccount(
            {
              newAccount: mint,
              space: MINT_SIZE,
              program: tokenProgram.address,
              instructionKey:
                params.createAccountInstructionKey ?? 'createAccount',
            },
            { payer, programs }
          )
      )

      // Initialize the mint.
      .add({
        instruction: createInitializeMintInstruction(
          mint.publicKey,
          decimals,
          mintAuthority,
          freezeAuthority,
          tokenProgram.address
        ),
        signers: [mint],
        key: params.initializeMintInstructionKey ?? 'initializeMint',
      })
  );
};
