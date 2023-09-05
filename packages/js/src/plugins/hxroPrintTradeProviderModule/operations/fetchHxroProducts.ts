import dexterity from '@hxronetwork/dexterity-ts';
import BN from 'bn.js';
import { OptionType } from '@convergence-rfq/risk-engine';
import { HxroProductInfo } from '../types';
import { Convergence } from '@/Convergence';
import {
  Operation,
  OperationHandler,
  OperationScope,
  PublicKey,
  useOperation,
} from '@/types';
import { CvgWallet } from '@/utils';
import { BaseAsset } from '@/plugins/protocolModule';

const Key = 'FetchHxroProducts' as const;

export const fetchHxroProductsOperation =
  useOperation<FetchHxroProductsOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type FetchHxroProductsOperation = Operation<
  typeof Key,
  FetchHxroProductsInput,
  FetchHxroProductsOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type FetchHxroProductsInput = {} | undefined;

/**
 * @group Operations
 * @category Outputs
 */
export type FetchHxroProductsOutput = HxroProductInfo[];

type BaseProductData = {
  productIndex: number;
  productAddress: PublicKey;
};

/**
 * @group Operations
 * @category Handlers
 */
export const fetchHxroProductsOperationHandler: OperationHandler<FetchHxroProductsOperation> =
  {
    handle: async (
      _operation: FetchHxroProductsOperation,
      cvg: Convergence,
      scope: OperationScope
    ): Promise<FetchHxroProductsOutput> => {
      // dexterity.getManifest adds a lot of clutter to logs, so we disable console.debug for this call
      // TODO: remove this workaround when dexterity library is updated
      const { debug } = console;
      console.debug = () => {};
      let manifest: any; // dexterity doesn't export a type for a manifest
      try {
        manifest = await dexterity.getManifest(
          cvg.connection.rpcEndpoint,
          true,
          new CvgWallet(cvg)
        );
      } finally {
        console.debug = debug;
      }

      const baseProductData = await parseBaseProductData(cvg, manifest);
      scope.throwIfCanceled();

      const baseAssets = await cvg.protocol().getBaseAssets();
      const productsData = await Promise.all(
        baseProductData.map((baseData) =>
          expandProductData(manifest, baseAssets, baseData)
        )
      );

      scope.throwIfCanceled();

      return productsData.filter((x): x is HxroProductInfo => x !== null);
    },
  };

const parseBaseProductData = async (
  cvg: Convergence,
  manifest: any
): Promise<BaseProductData[]> => {
  const { validMpg } = await cvg.hxro().fetchConfig();

  const mpg = await manifest.getMPG(validMpg);

  return [...dexterity.Manifest.GetProductsOfMPG(mpg).values()]
    .filter((productInfo) => productInfo.product?.outright !== undefined)
    .map((productInfo) => ({
      productIndex: productInfo.index as number,
      productAddress: productInfo.product.outright.outright.metadata
        .productKey as PublicKey,
    }));
};

const expandProductData = async (
  manifest: any,
  baseAssets: BaseAsset[],
  baseData: BaseProductData
): Promise<HxroProductInfo | null> => {
  const metadata = (await manifest.getDerivativeMetadata(
    baseData.productAddress
  )) as any;
  const {
    instrumentType: rawInstrumentType,
    strike,
    initializationTime,
    fullFundingPeriod,
    oracleType,
    priceOracle,
  } = metadata;
  const strikePriceIsZero = strike.m.eq(new BN(0));
  const instrumentType = parseHxroInstrumentType(rawInstrumentType);

  const baseAsset = baseAssets.find(
    (baseAsset) =>
      baseAsset.enabled &&
      baseAsset.pythOracle !== undefined &&
      oracleType.pyth !== undefined &&
      baseAsset.pythOracle.equals(priceOracle)
  );

  if (baseAsset === undefined) {
    return null;
  }

  const commonInResponse = {
    ...baseData,
    baseAssetIndex: baseAsset.index,
  };

  const isOption =
    !strikePriceIsZero &&
    (instrumentType === 'expiring-call' || instrumentType === 'expiring-put');
  if (isOption) {
    return {
      ...commonInResponse,
      instrumentType: 'option',
      optionType:
        instrumentType === 'expiring-call' ? OptionType.Call : OptionType.Put,
      strikePrice: strike,
      expirationTimestamp: initializationTime.add(fullFundingPeriod),
    };
  }

  const isTermFuture = strikePriceIsZero && instrumentType === 'expiring-call';
  if (isTermFuture) {
    return {
      ...commonInResponse,
      instrumentType: 'term-future',
    };
  }

  const isPerpFuture = instrumentType === 'recurring-call';
  if (isPerpFuture) {
    return {
      ...commonInResponse,
      instrumentType: 'perp-future',
    };
  }

  return null;
};

const parseHxroInstrumentType = (instrumentType: any) => {
  if (instrumentType.expiringCall !== undefined) {
    return 'expiring-call';
  }

  if (instrumentType.expiringPut !== undefined) {
    return 'expiring-put';
  }

  if (instrumentType.recurringCall !== undefined) {
    return 'recurring-call';
  }

  if (instrumentType.recurringPut !== undefined) {
    return 'recurring-put';
  }

  throw new Error('Unrecognized Hxro instrument type!');
};
