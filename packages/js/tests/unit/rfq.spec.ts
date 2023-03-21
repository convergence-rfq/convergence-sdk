import { expect } from 'expect';
import { PublicKey } from '@solana/web3.js';

import {
  ChildProccess,
  Ctx,
  readCtx,
  spawnValidator,
} from '../../../validator';
import { createSdk } from '../helpers';
import { OrderType, SpotInstrument, Side } from '../../src';

describe('rfq', () => {
  let validator: ChildProccess;
  let ctx: Ctx;

  before((done) => {
    ctx = readCtx();
    validator = spawnValidator(done);
  });

  after(() => {
    validator.kill();
  });

  it('create', async () => {
    const cvg = await createSdk('taker');
    const [baseMint, quoteMint] = await Promise.all([
      cvg.tokens().findMintByAddress({ address: new PublicKey(ctx.baseMint) }),
      cvg.tokens().findMintByAddress({ address: new PublicKey(ctx.quoteMint) }),
    ]);
    const { rfq } = await cvg.rfqs().createAndFinalize({
      instruments: [
        new SpotInstrument(cvg, baseMint, {
          amount: 1.5,
          side: Side.Bid,
        }),
      ],
      orderType: OrderType.TwoWay,
      fixedSize: { __kind: 'BaseAsset', legsMultiplierBps: 1 },
      quoteAsset: cvg
        .instrument(new SpotInstrument(cvg, quoteMint))
        .toQuoteAsset(),
      activeWindow: 60 * 60,
      settlingWindow: 50 * 5,
    });
    expect(rfq).toHaveProperty('address');
  });
});
