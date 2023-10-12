import { expect } from 'expect';

import { protocolCache } from '../../src';
import { createUserCvg } from '../helpers';

describe('unit.protocol', () => {
  const cvg = createUserCvg('dao');

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

  it('close', async () => {
    const { response } = await cvg.protocol().close();
    expect(response).toHaveProperty('signature');
  });

  it('initialize', async () => {
    const { protocol } = await cvg.protocol().initialize({});
    expect(protocol.address).toEqual(cvg.protocol().pdas().protocol());
  });
});
