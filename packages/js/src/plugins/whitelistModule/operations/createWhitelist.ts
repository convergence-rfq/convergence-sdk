import { createCreateWhitelistInstruction } from '@convergence-rfq/rfq';
import { PublicKey, Keypair } from '@solana/web3.js';
import { Whitelist, assertWhitelist } from '../models/Whitelist';
import {
  Operation,
  OperationHandler,
  OperationScope,
  makeConfirmOptionsFinalizedOnMainnet,
  useOperation,
} from '../../../types';
import { SendAndConfirmTransactionResponse } from '@/plugins/rpcModule';
import { Convergence } from '@/Convergence';
import {
  TransactionBuilder,
  TransactionBuilderOptions,
} from '@/utils/TransactionBuilder';

const Key = 'CreateWhitelistOperation' as const;

/**
 * Creates a new Whitelist.
 *
 * ```ts
 * const { whitelist} = await convergence
 *   .whitelist()
 *   .createWhitelist({
 *       creator: PublicKey;
 *       capacity: number;
 *       whitelist: PublicKey[];
 *   });
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const createWhitelistOperation =
  useOperation<CreateWhitelistOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type CreateWhitelistOperation = Operation<
  typeof Key,
  CreateWhitelistInput,
  CreateWhitelistOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type CreateWhitelistInput = {
  creator: PublicKey;
  whitelist: PublicKey[];
};

/**
 * @group Operations
 * @category Outputs
 */
export type CreateWhitelistOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;

  /** The newly created Whitelist */
  whitelist: Whitelist;
};

/**
 * @group Operations
 * @category Handlers
 */
export const createWhitelistOperationHandler: OperationHandler<CreateWhitelistOperation> =
  {
    handle: async (
      operation: CreateWhitelistOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<CreateWhitelistOutput> => {
      const { creator, whitelist } = operation.input;
      const whitelistKeypair = Keypair.generate();
      const builder = await createWhitelistBuilder(
        convergence,
        {
          creator,
          whitelist,
          whitelistKeypair,
        },
        scope
      );

      const confirmOptions = makeConfirmOptionsFinalizedOnMainnet(
        convergence,
        scope.confirmOptions
      );
      const { response } = await builder.sendAndConfirm(
        convergence,
        confirmOptions
      );
      scope.throwIfCanceled();

      const whitelistAccount = await convergence
        .whitelist()
        .findWhitelistByAddress({ address: whitelistKeypair.publicKey });
      assertWhitelist(whitelistAccount);

      return { response, whitelist: whitelistAccount };
    },
  };

/**
 * @group Transaction Builders
 * @category Inputs
 */
export type CreateWhitelistBuilderParams = CreateWhitelistInput & {
  whitelistKeypair: Keypair;
};

/**
 * @group Transaction Builders
 * @category Outputs
 */

export type CreateWhitelistBuilderResult = TransactionBuilder;

export const createWhitelistBuilder = async (
  convergence: Convergence,
  params: CreateWhitelistBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<CreateWhitelistBuilderResult> => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;

  const { creator, whitelist, whitelistKeypair } = params;

  const systemProgram = convergence.programs().getSystem(programs);
  const rfqProgram = convergence.programs().getRfq(programs);

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .add({
      instruction: createCreateWhitelistInstruction(
        {
          creator,
          whitelistAccount: whitelistKeypair.publicKey,
          systemProgram: systemProgram.address,
        },
        {
          whitelist,
        },
        rfqProgram.address
      ),
      signers: [whitelistKeypair, payer],
      key: 'CreateWhitelist',
    });
};
