import { createChangeBaseAssetParametersInstruction } from '@convergence-rfq/rfq';
import { PublicKey } from '@solana/web3.js';

import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import {
  RiskCategory,
  toSolitaRiskCategory,
  OracleSource,
  toSolitaOracleSource,
} from '../models/BaseAsset';
import { Convergence } from '../../../Convergence';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '../../../types';
import {
  TransactionBuilder,
  TransactionBuilderOptions,
} from '../../../utils/TransactionBuilder';
import { baseAssetsCache } from '../cache';

const Key = 'changeBaseAssetParametersOperation' as const;

/**
 * @group Operations
 * @category Constructors
 */
export const changeBaseAssetParametersOperation =
  useOperation<ChangeBaseAssetParametersOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type ChangeBaseAssetParametersOperation = Operation<
  typeof Key,
  ChangeBaseAssetParametersInput,
  ChangeBaseAssetParametersOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type ChangeBaseAssetParametersInput = {
  index: number;

  enabled?: boolean;

  riskCategory?: RiskCategory;

  /**
   * If this parameter is missing, oracle source would be unchanged
   * If a null value is passed, unset it
   */
  oracleSource?: OracleSource;

  /**
   * If this parameter is missing, switchboard oracle would be unchanged
   * If a null value is passed, unset it
   */
  switchboardOracle?: PublicKey | null;

  /**
   * If this parameter is missing, pyth oracle would be unchanged
   * If a null value is passed, unset it
   */
  pythOracle?: PublicKey | null;

  /**
   * If this parameter is missing, in place price would be unchanged
   * If a null value is passed, unset it
   */
  inPlacePrice?: number | null;
};

/**
 * @group Operations
 * @category Outputs
 */
export type ChangeBaseAssetParametersOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const changeBaseAssetParametersOperationHandler: OperationHandler<ChangeBaseAssetParametersOperation> =
  {
    handle: async (
      operation: ChangeBaseAssetParametersOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<ChangeBaseAssetParametersOutput> => {
      scope.throwIfCanceled();

      const builder = changeBaseAssetParametersBuilder(
        convergence,
        operation.input,
        scope
      );
      const { response } = await builder.sendAndConfirm(
        convergence,
        scope.confirmOptions
      );
      baseAssetsCache.clear();

      return { response };
    },
  };

/**
 * @group Transaction Builders
 * @category Inputs
 */
export type ChangeBaseAssetParametersBuilderParams =
  ChangeBaseAssetParametersInput;

/**
 * @group Transaction Builders
 * @category Constructors
 */
export const changeBaseAssetParametersBuilder = (
  cvg: Convergence,
  params: ChangeBaseAssetParametersBuilderParams,
  options: TransactionBuilderOptions = {}
): TransactionBuilder => {
  const { programs, payer = cvg.rpc().getDefaultFeePayer() } = options;
  const rfqProgram = cvg.programs().getRfq(programs);
  const protocolPda = cvg.protocol().pdas().protocol();
  const {
    index,
    enabled,
    riskCategory,
    oracleSource,
    switchboardOracle,
    pythOracle,
    inPlacePrice,
  } = params;

  const baseAsset = cvg.protocol().pdas().baseAsset({ index });

  const wrapInCustomOption = <T>(value: T | undefined) =>
    value !== undefined
      ? { __kind: 'Some' as const, value }
      : { __kind: 'None' as const };

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .add({
      instruction: createChangeBaseAssetParametersInstruction(
        {
          authority: cvg.identity().publicKey,
          protocol: protocolPda,
          baseAsset,
        },
        {
          riskCategory: riskCategory
            ? toSolitaRiskCategory(riskCategory)
            : null,
          enabled: enabled ?? null,
          oracleSource: oracleSource
            ? toSolitaOracleSource(oracleSource)
            : null,
          switchboardOracle: wrapInCustomOption(switchboardOracle),
          pythOracle: wrapInCustomOption(pythOracle),
          inPlacePrice: wrapInCustomOption(inPlacePrice),
        },
        rfqProgram.address
      ),
      signers: [cvg.identity()],
      key: 'changeBaseAssetParameters',
    });
};
