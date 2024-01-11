import { createRemoveAddressFromWhitelistInstruction } from '@convergence-rfq/rfq';
import { ComputeBudgetProgram, PublicKey, Signer } from '@solana/web3.js';

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
import { TRANSACTION_PRIORITY_FEE_MAP } from '@/constants';

const Key = 'RemoveAddressFromWhitelistOperation' as const;

/**
 * remove address from Whitelist.
 *
 * ```ts
 * await convergence
 *   .whitelist()
 *   .removeAddressFromWhitelist({
 *       creator?: Signer;
 *       whitelist: PublicKey;
 *       addressToRemove: PublicKey;
 *   });
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const removeAddressFromWhitelistOperation =
  useOperation<RemoveAddressFromWhitelistOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type RemoveAddressFromWhitelistOperation = Operation<
  typeof Key,
  RemoveAddressFromWhitelistInput,
  RemoveAddressFromWhitelistOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type RemoveAddressFromWhitelistInput = {
  creator?: Signer;
  whitelist: PublicKey;
  addressToRemove: PublicKey;
};

/**
 * @group Operations
 * @category Outputs
 */
export type RemoveAddressFromWhitelistOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const removeAddressFromWhitelistOperationHandler: OperationHandler<RemoveAddressFromWhitelistOperation> =
  {
    handle: async (
      operation: RemoveAddressFromWhitelistOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<RemoveAddressFromWhitelistOutput> => {
      const { whitelist, addressToRemove } = operation.input;

      const whitelistAccount = await convergence
        .whitelist()
        .findWhitelistByAddress({
          address: whitelist,
        });

      if (whitelistAccount.whitelist.length === 0) {
        throw new Error('WhitelistIsEmpty');
      }
      const builder = await RemoveAddressFromWhitelistBuilder(
        convergence,
        {
          whitelist,
          addressToRemove,
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
export type RemoveAddressFromWhitelistBuilderParams =
  RemoveAddressFromWhitelistInput & {
    whitelist: PublicKey;
    addressToRemove: PublicKey;
  };

/**
 * @group Transaction Builders
 * @category Outputs
 *
 * */

export type RemoveAddressFromWhitelistBuilderResult = TransactionBuilder;

export const RemoveAddressFromWhitelistBuilder = async (
  convergence: Convergence,
  params: RemoveAddressFromWhitelistBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<RemoveAddressFromWhitelistBuilderResult> => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;

  const {
    whitelist,
    addressToRemove,
    creator = convergence.identity(),
  } = params;

  const systemProgram = convergence.programs().getSystem(programs);
  const rfqProgram = convergence.programs().getRfq(programs);

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .addTxPriorityFeeIx(convergence)
    .add({
      instruction: createRemoveAddressFromWhitelistInstruction(
        {
          creator: creator.publicKey,
          whitelistAccount: whitelist,
          systemProgram: systemProgram.address,
        },
        {
          address: addressToRemove,
        },
        rfqProgram.address
      ),
      signers: [creator],
      key: 'RemoveAddressFromWhitelist',
    });
};
