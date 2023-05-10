import { expect } from 'expect';

import { createUserCvg } from '../helpers';

describe('unit.human', () => {
  const cvg = createUserCvg('taker');

  it('get protocol', async () => {
    const protocol = await cvg.human().getProtocol();
    expect(typeof protocol).toEqual('object');
  });
});
