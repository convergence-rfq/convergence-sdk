import { Convergence } from '../../Convergence';
import { useCache, DEFAULT_CACHE } from '../../utils';

export const collateralMintCache = useCache(
  DEFAULT_CACHE,
  async (cvg: Convergence) => {
    // TODO: Can this be the protocol cache?
    const protocolModel = await cvg.protocol().get();
    return await cvg
      .tokens()
      .findMintByAddress({ address: protocolModel.collateralMint });
  }
);
