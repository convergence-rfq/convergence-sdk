import { createCloseProtocolStateInstruction } from '@convergence-rfq/rfq';
import { PublicKey } from '@solana/web3.js';

import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { Convergence } from '../../../Convergence';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
  Signer,
} from '../../../types';
import { TransactionBuilder, TransactionBuilderOptions } from '../../../utils';
import { protocolCache } from '../cache';

const Key = 'CloseProtocolOperation' as const;

/**
 * Add an BaseAsset
 *
 * ```ts
 * await convergence
 *   .rfqs()
 *   .addBaseAsset({ address };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const closeProtocolOperation = useOperation<CloseProtocolOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type CloseProtocolOperation = Operation<
  typeof Key,
  CloseProtocolInput,
  CloseProtocolOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type CloseProtocolInput =
  | {
      /**
       * The owner of the protocol.
       */
      authority?: Signer;

      /**
       * The protocol to add the BaseAsset to.
       */
      protocol?: PublicKey;
    }
  | undefined;

/**
 * @group Operations
 * @category Outputs
 */
export type CloseProtocolOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const closeProtocolOperationHandler: OperationHandler<CloseProtocolOperation> =
  {
    handle: async (
      operation: CloseProtocolOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<CloseProtocolOutput> => {
      scope.throwIfCanceled();

      protocolCache.clear();

      const builder = closeProtocolBuilder(convergence, operation.input, scope);
      const { response } = await builder.sendAndConfirm(
        convergence,
        scope.confirmOptions
      );

      return { response };
    },
  };

/**
 * @group Transaction Builders
 * @category Inputs
 */
export type CloseProtocolBuilderParams = CloseProtocolInput;

/**
 * Adds an BaseAsset
 *
 * ```ts
 * const transactionBuilder = convergence
 *   .rfqs()
 *   .builders()
 *   .addBaseAsset({ address });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const closeProtocolBuilder = (
  convergence: Convergence,
  params: CloseProtocolBuilderParams,
  options: TransactionBuilderOptions = {}
): TransactionBuilder => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const {
    protocol = convergence.protocol().pdas().protocol(),
    authority = payer,
  } = params || {};

  const rfqProgram = convergence.programs().getRfq(programs);

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .add({
      instruction: createCloseProtocolStateInstruction(
        {
          authority: authority.publicKey,
          protocol,
        },
        rfqProgram.address
      ),
      signers: [authority],
      key: 'closeProtocolState',
    });
};
