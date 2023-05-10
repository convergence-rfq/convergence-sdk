import { expect } from 'expect';

import { createUserCvg } from '../helpers';

describe('unit.human', () => {
  const cvg = createUserCvg('taker');

  it('get protocol', async () => {
    const protocol = await cvg.human().getProtocol();
    expect(typeof protocol).toEqual('object');
  });

  it('get registered mints', async () => {
    const registeredMints = await cvg.human().getRegisteredMints();
    expect(typeof registeredMints).toEqual('object');
  });

  it('get base assets', async () => {
    const baseAssets = await cvg.human().getBaseAssets();
    expect(typeof baseAssets).toEqual('object');
  });
});
