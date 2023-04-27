import { expect } from 'expect';

import { createCvg } from '../helpers';
import { protocolCache } from '../../src/plugins/protocolModule/cache';

describe('protocol', () => {
  const cvg = createCvg();

  it('get', async () => {
    const protocol = await cvg.protocol().get();
    expect(protocol).toHaveProperty('address');
  });

  it('get cache', async () => {
    const protocol = await protocolCache.get(cvg);
    expect(protocol).toHaveProperty('address');
  });

  it('get pda [protocol]', async () => {
    const protocol = await cvg.protocol().get();
    const pda = cvg.protocol().pdas().protocol();
    expect(protocol.address).toEqual(pda);
  });

  it('get pda [base asset]', async () => {
    const baseAssetPda = cvg
      .protocol()
      .pdas()
      .baseAsset({ index: { value: 0 } });
    const baseAssets = await cvg.protocol().getBaseAssets();
    expect(baseAssetPda.toBase58()).toEqual(baseAssets[0].address.toBase58());
  });

  it('get base assets', async () => {
    const baseAssets = await cvg.protocol().getBaseAssets();
    expect(baseAssets).toHaveLength(2);
  });
});
