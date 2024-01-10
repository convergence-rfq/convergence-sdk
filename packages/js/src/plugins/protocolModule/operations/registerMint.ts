import { createRegisterMintInstruction } from '@convergence-rfq/rfq';
import { PublicKey } from '@solana/web3.js';

import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import {
  TransactionBuilder,
  TransactionBuilderOptions,
} from '../../../utils/TransactionBuilder';
import {
  makeConfirmOptionsFinalizedOnMainnet,
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
  Signer,
} from '../../../types';
import { Convergence } from '../../../Convergence';
import { registeredMintsCache } from '../cache';

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
  authority?: Signer;

  /**
   * The protocol address.
   *
   * @defaultValue `convergence.protocol().pdas().get()`
   */
  protocol?: PublicKey;

  /**
   * The protocol token mint.
   */
  mint: PublicKey;

  /**
   * Optional base asset index only needs to be passed if the mint is a base asset.
   *
   * @defaultValue `-1`
   */
  baseAssetIndex?: number;
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

      registeredMintsCache.clear();

      return { ...output };
    },
  };

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
  const {
    authority = convergence.identity(),
    mint,
    baseAssetIndex = -1,
  } = params;

  const systemProgram = convergence.programs().getSystem(programs);
  const rfqProgram = convergence.programs().getRfq();

  const protocol = convergence.protocol().pdas().protocol();
  const mintInfo = convergence.rfqs().pdas().mintInfo({ mint });

  let baseAsset: PublicKey;
  if (baseAssetIndex >= 0) {
    baseAsset = convergence
      .protocol()
      .pdas()
      .baseAsset({ index: baseAssetIndex });
  } else {
    baseAsset = PublicKey.default;
  }

  return TransactionBuilder.make<RegisterMintBuilderContext>()
    .setFeePayer(payer)
    .add({
      instruction: createRegisterMintInstruction(
        {
          authority: authority.publicKey,
          protocol,
          mintInfo,
          baseAsset: baseAssetIndex >= 0 ? baseAsset : PublicKey.default,
          mint,
          systemProgram: systemProgram.address,
        },
        rfqProgram.address
      ),
      signers: [payer],
      key: 'registerMint',
    });
};
