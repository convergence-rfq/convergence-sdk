import { createCleanUpWhitelistInstruction } from '@convergence-rfq/rfq';
import { PublicKey, Signer } from '@solana/web3.js';

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

const Key = 'CleanUpWhitelistOperation' as const;

/**
 * close a whitelist account.
 *
 * ```ts
 * await convergence
 *   .whitelist()
 *   .cleanUpWhitelist({
 *    creator?: Signer;
 *    whitelist: PublicKey;
 *   });
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const cleanUpWhitelistOperation =
  useOperation<CleanUpWhitelistOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type CleanUpWhitelistOperation = Operation<
  typeof Key,
  CleanUpWhitelistInput,
  CleanUpWhitelistOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type CleanUpWhitelistInput = {
  creator?: Signer;
  whitelist: PublicKey;
};

/**
 * @group Operations
 * @category Outputs
 */
export type CleanUpWhitelistOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const cleanUpWhitelistOperationHandler: OperationHandler<CleanUpWhitelistOperation> =
  {
    handle: async (
      operation: CleanUpWhitelistOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<CleanUpWhitelistOutput> => {
      const { whitelist } = operation.input;
      const builder = await cleanUpWhitelistBuilder(
        convergence,
        {
          whitelist,
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
      return { response };
    },
  };

/**
 * @group Transaction Builders
 * @category Inputs
 */
export type CleanUpWhitelistBuilderParams = CleanUpWhitelistInput & {
  whitelist: PublicKey;
};

/**
 * @group Transaction Builders
 * @category Outputs
 */

export type CleanUpWhitelistBuilderResult = TransactionBuilder;

export const cleanUpWhitelistBuilder = async (
  convergence: Convergence,
  params: CleanUpWhitelistBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<CleanUpWhitelistBuilderResult> => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;

  const { creator = convergence.identity(), whitelist } = params;

  const systemProgram = convergence.programs().getSystem(programs);
  const rfqProgram = convergence.programs().getRfq(programs);

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .add({
      instruction: createCleanUpWhitelistInstruction(
        {
          creator: creator.publicKey,
          whitelistAccount: whitelist,
          systemProgram: systemProgram.address,
        },

        rfqProgram.address
      ),
      signers: [creator],
      key: 'CleanUpWhitelist',
    });
};
