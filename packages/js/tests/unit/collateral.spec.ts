import { expect } from 'expect';
import { PublicKey } from '@solana/web3.js';

import { Ctx } from '../../../validator';
import { createCvg } from '../helpers';

describe('collateral', () => {
  const ctx = new Ctx();
  const cvg = createCvg();

  it('fund', async () => {
    // TODO: Add a balance diff for before and after check
    cvg.collateral().fund({ amount: 10_000.5 });
  });

  it('get', async () => {
    const collateral = await cvg
      .collateral()
      .findByUser({ user: new PublicKey(ctx.taker) });
    expect(collateral).toHaveProperty('address');
  });
});
