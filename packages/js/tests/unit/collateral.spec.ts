import { expect } from 'expect';
import { PublicKey } from '@solana/web3.js';

import {
  ChildProccess,
  Ctx,
  readCtx,
  spawnValidator,
} from '../../../validator';
import { createCvg } from '../helpers';
import { Convergence } from '../../src';

describe('collateral', () => {
  let validator: ChildProccess;
  let cvg: Convergence;
  let ctx: Ctx;

  before((done) => {
    ctx = readCtx();
    cvg = createCvg();
    validator = spawnValidator(done);
  });

  after(() => {
    validator.kill();
  });

  it('get', async () => {
    const collateral = await cvg
      .collateral()
      .findByUser({ user: new PublicKey(ctx.taker) });
    expect(collateral).toHaveProperty('address');

  });

  it('fund',async () =>{
    cvg.collateral().fund({amount:1000})
  })

  it('get', async () => {
    const collateral = await cvg
      .collateral()
      .findByUser({ user: new PublicKey(ctx.taker) });
    expect(collateral).toHaveProperty('address');
  });
  
});