import { Convergence } from '../../Convergence';
import { useCache } from '../../utils/cache';
import { ProtocolGpaBuilder } from './ProtocolGpaBuilder';
import {
  toBaseAssetAccount,
  toProtocolAccount,
  toRegisteredMintAccount,
} from './accounts';
import {
  BaseAsset,
  RegisteredMint,
  toBaseAsset,
  toProtocol,
  toRegisteredMint,
} from './models';

export const protocolCache = useCache(
  async (cvg: Convergence, commitment = 'confirmed') => {
    const address = cvg.protocol().pdas().protocol();
    const account = await cvg.rpc().getAccount(address, commitment);
    return toProtocol(toProtocolAccount(account));
  }
);

export const baseAssetsCache = useCache(async (cvg: Convergence) => {
  const rfqProgram = cvg.programs().getRfq();
  const protocolGpaBuilder = new ProtocolGpaBuilder(cvg, rfqProgram.address);
  const baseAssets = await protocolGpaBuilder.whereBaseAssets().get();

  return baseAssets
    .map<BaseAsset | null>((account) => {
      if (account === null) {
        return null;
      }

      try {
        return toBaseAsset(toBaseAssetAccount(account));
      } catch (e) {
        return null;
      }
    })
    .filter((baseAsset): baseAsset is BaseAsset => baseAsset !== null)
    .sort((a: BaseAsset, b: BaseAsset) => {
      return a.index - b.index;
    });
});

export const registeredMintsCache = useCache(async (cvg: Convergence) => {
  const rfqProgram = cvg.programs().getRfq();
  const protocolGpaBuilder = new ProtocolGpaBuilder(cvg, rfqProgram.address);
  const registeredMints = await protocolGpaBuilder.whereRegisteredMints().get();

  return registeredMints
    .map<RegisteredMint | null>((account) => {
      if (account === null) {
        return null;
      }

      try {
        return toRegisteredMint(toRegisteredMintAccount(account));
      } catch (e) {
        return null;
      }
    })
    .filter(
      (registeredMint): registeredMint is RegisteredMint =>
        registeredMint !== null
    );
});
