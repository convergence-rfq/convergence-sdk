import dexterity from '@hxronetwork/dexterity-ts';
import BN from 'bn.js';
import { OptionType } from '@convergence-rfq/risk-engine';
import { HxroProductInfo } from '../types';
import { fetchValidHxroMpg } from '../helpers';
import { hxroManifestCache } from '../cache';
import { Convergence } from '@/Convergence';
import {
  Operation,
  OperationHandler,
  OperationScope,
  PublicKey,
  useOperation,
} from '@/types';
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
  productName: string;
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
      const manifest = await hxroManifestCache.get(cvg);
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
  const mpg = await fetchValidHxroMpg(cvg, manifest);

  return [...dexterity.Manifest.GetProductsOfMPG(mpg).values()]
    .filter((productInfo) => productInfo.product?.outright !== undefined)
    .map((productInfo) => {
      const byteName: number[] =
        productInfo.product.outright.outright.metadata.name;
      const name = byteName.map((char) => String.fromCharCode(char)).join('');
      return {
        productIndex: productInfo.index as number,
        productName: name,
        productAddress: productInfo.product.outright.outright.metadata
          .productKey as PublicKey,
      };
    });
};

const expandProductData = async (
  manifest: any,
  baseAssets: BaseAsset[],
  baseData: BaseProductData
): Promise<HxroProductInfo | null> => {
  const metadata = await manifest.getDerivativeMetadata(
    baseData.productAddress
  );
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
  const isTermFuture = strikePriceIsZero && instrumentType === 'expiring-call';
  const isPerpFuture = instrumentType === 'recurring-call';
  const expirationTimestamp =
    isOption || isTermFuture
      ? initializationTime.add(fullFundingPeriod)
      : undefined;

  // filter out expired products
  if (expirationTimestamp !== undefined) {
    const currentTimestamp = Date.now() / 1000; // convert to seconds

    if (expirationTimestamp <= currentTimestamp) {
      return null;
    }
  }

  if (isOption) {
    return {
      ...commonInResponse,
      instrumentType: 'option',
      optionType:
        instrumentType === 'expiring-call' ? OptionType.Call : OptionType.Put,
      strikePrice: strike,
      expirationTimestamp,
    };
  }
  if (isTermFuture) {
    return {
      ...commonInResponse,
      instrumentType: 'term-future',
      expirationTimestamp,
    };
  }
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
