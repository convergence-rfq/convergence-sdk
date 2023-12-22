import { createAddAddressToWhitelistInstruction } from '@convergence-rfq/rfq';
import { PublicKey, Signer } from '@solana/web3.js';

import {
  Operation,
  OperationHandler,
  OperationScope,
  makeConfirmOptionsFinalizedOnMainnet,
  useOperation,
} from '../../../types';
import {
  TransactionBuilder,
  TransactionBuilderOptions,
} from '../../../utils/TransactionBuilder';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { Convergence } from '../../../Convergence';

const Key = 'AddAddressToWhitelistOperation' as const;

/**
 * Add new address to the whitelist.
 *
 * ```ts
 * const { whitelist} = await convergence
 *   .rfqs()
 *   .AddAddressToWhitelist({
 *      creator?: Signer;
 *       whitelist: PublicKey;
 *      addressToAdd: PublicKey;
 *   });
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const addAddressToWhitelistOperation =
  useOperation<AddAddressToWhitelistOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type AddAddressToWhitelistOperation = Operation<
  typeof Key,
  AddAddressToWhitelistInput,
  AddAddressToWhitelistOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type AddAddressToWhitelistInput = {
  creator?: Signer;
  whitelist: PublicKey;
  addressToAdd: PublicKey;
};

/**
 * @group Operations
 * @category Outputs
 */
export type AddAddressToWhitelistOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const addAddressToWhitelistOperationHandler: OperationHandler<AddAddressToWhitelistOperation> =
  {
    handle: async (
      operation: AddAddressToWhitelistOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<AddAddressToWhitelistOutput> => {
      const { whitelist, addressToAdd } = operation.input;

      const builder = await AddAddressToWhitelistBuilder(
        convergence,
        {
          whitelist,
          addressToAdd,
        },
        scope
      );
      scope.throwIfCanceled();
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
export type AddAddressToWhitelistBuilderParams = AddAddressToWhitelistInput & {
  whitelist: PublicKey;
  addressToAdd: PublicKey;
};

/**
 * @group Transaction Builders
 * @category Outputs
 */

export type AddAddressToWhitelistBuilderResult = TransactionBuilder;

/**
 * @group Transaction Builders
 * @category Constructors
 */

export const AddAddressToWhitelistBuilder = async (
  convergence: Convergence,
  params: AddAddressToWhitelistBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<AddAddressToWhitelistBuilderResult> => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;

  const { whitelist, addressToAdd, creator = convergence.identity() } = params;

  const whitelistAccount = await convergence
    .whitelist()
    .findWhitelistByAddress({
      address: whitelist,
    });

  if (whitelistAccount.whitelist.length === whitelistAccount.capacity) {
    throw new Error('WhitelistMaximumCapacityReached');
  }

  const addressAlreadyExists = await convergence
    .whitelist()
    .checkAddressExistsOnWhitelist({
      whitelistAddress: whitelist,
      addressToSearch: addressToAdd,
    });
  if (addressAlreadyExists) {
    throw new Error('AddressAlreadyExistsOnWhitelist');
  }

  const systemProgram = convergence.programs().getSystem(programs);
  const rfqProgram = convergence.programs().getRfq(programs);

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .add({
      instruction: createAddAddressToWhitelistInstruction(
        {
          creator: creator.publicKey,
          whitelistAccount: whitelist,
          systemProgram: systemProgram.address,
        },
        {
          address: addressToAdd,
        },
        rfqProgram.address
      ),
      signers: [creator],
      key: 'AddAddressToWhitelist',
    });
};
