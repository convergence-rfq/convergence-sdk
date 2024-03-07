import { AccountMeta, PublicKey } from '@solana/web3.js';
import { LegInstrument } from '../instrumentModule';
import { PrintTradeLeg } from '../printTradeModule';
import { toPriceOracle } from '../protocolModule';
import { Convergence } from '@/Convergence';

export async function getRiskEngineAccounts(
  cvg: Convergence,
  legs: LegInstrument[] | PrintTradeLeg[]
): Promise<AccountMeta[]> {
  const configAddress = cvg.riskEngine().pdas().config();

  const baseAssetIndexSet: Set<number> = new Set(
    legs.map((leg) => leg.getBaseAssetIndex().value)
  );
  const uniqueBaseAssetIndexes = Array.from(baseAssetIndexSet);

  const baseAssetAddresses = uniqueBaseAssetIndexes.map((value) =>
    cvg.protocol().pdas().baseAsset({ index: value })
  );

  const oracleInfos = await Promise.all(
    baseAssetAddresses.map(async (baseAsset) =>
      cvg.protocol().findBaseAssetByAddress({ address: baseAsset })
    )
  );
  const oracleAddresses = oracleInfos
    .map((oracleInfo) => toPriceOracle(oracleInfo).address)
    .filter((address): address is PublicKey => address !== undefined);

  const allAddresses = [
    configAddress,
    ...baseAssetAddresses,
    ...oracleAddresses,
  ];

  return allAddresses.map((address) => ({
    pubkey: address,
    isSigner: false,
    isWritable: false,
  }));
}
