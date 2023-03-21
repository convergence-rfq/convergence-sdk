import { expect } from 'expect';
import { PublicKey } from '@solana/web3.js';

import {
  ChildProccess,
  Ctx,
  readCtx,
  spawnValidator,
} from '../../../validator';
import { createSdk } from '../helpers';
import {
  OrderType,
  OptionType,
  PsyoptionsAmericanInstrument,
  SpotInstrument,
  Side,
  Mint,
  initializeNewAmericanOption,
  toBigNumber,
  createAmericanProgram,
} from '../../src';

describe('european', () => {
  let validator: ChildProccess;
  let ctx: Ctx;

  let baseMint: Mint;
  let quoteMint: Mint;

  const setMints = (done: any) => {
    let counter = 2;

    const tryDone = () => {
      counter -= 1;
      if (counter === 0) {
        done();
      }
    };

    createSdk('dao').then((cvg) => {
      cvg
        .tokens()
        .findMintByAddress({ address: new PublicKey(ctx.baseMint) })
        .then((mint) => {
          baseMint = mint;
          tryDone();
        });
      cvg
        .tokens()
        .findMintByAddress({ address: new PublicKey(ctx.quoteMint) })
        .then((mint) => {
          quoteMint = mint;
          tryDone();
        });
    });
  };

  before((done) => {
    ctx = readCtx();

    // Validator takes a callback so if we need to set data like mints do it here
    validator = spawnValidator(() => setMints(done));
  });

  after(() => {
    validator.kill();
  });

  it('create', async () => {
    const cvg = await createSdk('taker');
    const americanProgram = createAmericanProgram(cvg);
    const { optionMarketKey, optionMarket } = await initializeNewAmericanOption(
      cvg,
      americanProgram,
      baseMint,
      quoteMint,
      toBigNumber(18_000),
      toBigNumber(1),
      3_500
    );
    const { rfq, response } = await cvg.rfqs().createAndFinalize({
      instruments: [
        new SpotInstrument(cvg, baseMint, {
          amount: 1.5,
          side: Side.Bid,
        }),
        new PsyoptionsAmericanInstrument(
          cvg,
          baseMint,
          quoteMint,
          OptionType.CALL,
          optionMarket,
          optionMarketKey,
          {
            amount: 5,
            side: Side.Bid,
          }
        ),
      ],
      orderType: OrderType.Sell,
      fixedSize: { __kind: 'BaseAsset', legsMultiplierBps: 1 },
      quoteAsset: new SpotInstrument(cvg, quoteMint).toQuoteAsset(),
    });
    expect(rfq).toHaveProperty('address');
    expect(response.signature).toBeDefined();
  });
});
