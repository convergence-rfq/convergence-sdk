import { Convergence } from '../../Convergence';
import { useCache, DEFAULT_CACHE } from '../../utils';
import { protocolCache } from '../protocolModule';

export const collateralMintCache = useCache(
  DEFAULT_CACHE,
  async (cvg: Convergence) => {
    const protocolModel = await protocolCache.get(cvg);
    return await cvg
      .tokens()
      .findMintByAddress({ address: protocolModel.collateralMint });
  }
);
