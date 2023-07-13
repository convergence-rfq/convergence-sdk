import { PublicKey } from '@solana/web3.js';

import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { Convergence } from '../../../Convergence';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '../../../types';
<<<<<<< HEAD
import {
  TransactionBuilder,
  TransactionBuilderOptions,
} from '../../../utils/TransactionBuilder';
import { InstrumentPdasClient } from '../../instrumentModule/InstrumentPdasClient';
import { Response, assertResponse } from '../models/Response';
import { legToBaseAssetMint } from '@/plugins/instrumentModule';
import { SendAndConfirmTransactionResponse } from '@/plugins';
=======
import { cleanUpResponseBuilder } from './cleanUpResponse';
>>>>>>> ced46ea3345082f758a15cf7553ef78378f45408

const Key = 'cleanUpResponsesOperation' as const;

/**
 * Cleans up Rfq responses.
 *
 * ```ts
 * await convergence
 *   .rfqs()
 *   .cleanUpResponses({
 *     rfq: <publicKey>,
 *     responses: <publicKey>,
 *     firstToPrepare: <publicKey>
 *   });
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const cleanUpResponsesOperation =
  useOperation<CleanUpResponsesOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type CleanUpResponsesOperation = Operation<
  typeof Key,
  CleanUpResponsesInput,
  CleanUpResponsesOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type CleanUpResponsesInput = {
  /**
   * The maker public key address.
   */
  maker: PublicKey;

  /**
   * The address of the reponse accounts.
   */
  responses: PublicKey[];

  /**
   * The protocol address.
   *
   * @defaultValue `convergence.protocol().pdas().protocol()`
   */
  protocol?: PublicKey;

  /**
   * The address of the DAO.
   */
  dao?: PublicKey;
};

/**
 * @group Operations
 * @category Outputs
 */
export type CleanUpResponsesOutput = {
  responses: SendAndConfirmTransactionResponse[];
};

/**
 * @group Operations
 * @category Handlers
 */
export const cleanUpResponsesOperationHandler: OperationHandler<CleanUpResponsesOperation> =
  {
    handle: async (
      operation: CleanUpResponsesOperation,
      convergence: Convergence,
      scope: OperationScope
    ) => {
      const { responses: rfqResponses } = operation.input;

      const builders = await Promise.all(
        rfqResponses.map((response) =>
          cleanUpResponseBuilder(
            convergence,
            { response, ...operation.input },
            scope
          )
        )
      );
      const lastValidBlockHeight = await convergence.rpc().getLatestBlockhash();
      const signedTxs = await convergence
        .identity()
        .signAllTransactions(
          builders.map((b) => b.toTransaction(lastValidBlockHeight))
        );

      const responses = await Promise.all(
        signedTxs.map((signedTx) =>
          convergence
            .rpc()
            .serializeAndSendTransaction(signedTx, scope.confirmOptions)
        )
      );
      scope.throwIfCanceled();

      return { responses };
    },
  };
