import { Convergence } from '../../Convergence';
import { useCache } from '../../utils';

export const collateralMintCache = useCache(300, async (cvg: Convergence) => {
  const protocolModel = await cvg.protocol().get();

  return await cvg
    .tokens()
    .findMintByAddress({ address: protocolModel.collateralMint });
});
