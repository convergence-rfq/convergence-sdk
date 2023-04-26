import { expect } from 'expect';

import { createCvg } from '../helpers';
import { protocolCache } from '../../src/plugins/protocolModule/cache';

describe('protocol', () => {
  const cvg = createCvg();

  it('get', async () => {
    const protocol = await cvg.protocol().get();
    expect(protocol).toHaveProperty('address');
  });

  it('cache', async () => {
    const protocol = await protocolCache.get(cvg);
    expect(protocol).toHaveProperty('address');
  });

  it('pda', async () => {
    const protocol = await cvg.protocol().get();
    const pda = cvg.protocol().pdas().protocol();
    expect(protocol.address).toEqual(pda);
  });
});
