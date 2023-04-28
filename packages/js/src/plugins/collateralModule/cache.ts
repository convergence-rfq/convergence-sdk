import { Convergence } from '../../Convergence';
import { useCache } from '../../utils';
import { protocolCache } from '../protocolModule';

export const collateralMintCache = useCache(async (cvg: Convergence) => {
  const protocolModel = await protocolCache.get(cvg);
  return await cvg
    .tokens()
    .findMintByAddress({ address: protocolModel.collateralMint });
});
