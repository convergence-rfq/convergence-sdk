import { expect } from 'expect';
import { PublicKey } from '@solana/web3.js';

import { CTX, createCvg } from '../helpers';

describe('collateral', () => {
  const cvg = createCvg();

  it('fund', async () => {
    // TODO: Add a balance diff for before and after check
    cvg.collateral().fund({ amount: 10_000.5 });
  });

  it('get', async () => {
    const collateral = await cvg
      .collateral()
      .findByUser({ user: new PublicKey(CTX.taker) });
    expect(collateral).toHaveProperty('address');
  });

  it('cache', async () => {
    const collateral = await cvg
      .collateral()
      .findByUser({ user: new PublicKey(CTX.taker) });
    expect(collateral).toHaveProperty('address');
  });
});
