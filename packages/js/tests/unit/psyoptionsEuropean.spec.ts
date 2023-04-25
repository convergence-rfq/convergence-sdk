import { expect } from 'expect';
import { PublicKey, Keypair } from '@solana/web3.js';
import * as anchor from '@project-serum/anchor';

import {
  ChildProccess,
  Ctx,
  readCtx,
  spawnValidator,
} from '../../../validator';
import { createSdk } from '../helpers';
import { IDL as PseudoPythIdl } from '../../../validator/fixtures/programs/pseudo_pyth_idl';
import { createPriceFeed } from '../../test/helpers';
import {
  OrderType,
  OptionType,
  PsyoptionsEuropeanInstrument,
  SpotInstrument,
  Side,
  Mint,
  initializeNewOptionMeta,
  createEuropeanProgram,
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

    createSdk().then((cvg) => {
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
    const europeanProgram = await createEuropeanProgram(cvg);
    const provider = new anchor.AnchorProvider(
      cvg.connection,
      new anchor.Wallet(cvg.rpc().getDefaultFeePayer() as Keypair),
      {}
    );
    const pseudoPythProgram = new anchor.Program(
      PseudoPythIdl,
      new PublicKey('FsJ3A3u2vn5cTVofAjvy6y5kwABJAqYWpe4975bi2epH'),
      provider
    );
    const oracle = await createPriceFeed(
      pseudoPythProgram,
      17_000,
      quoteMint.decimals * -1
    );
    const { euroMeta, euroMetaKey } = await initializeNewOptionMeta(
      cvg,
      oracle,
      europeanProgram,
      baseMint,
      quoteMint,
      23_354,
      1,
      3_600,
      0
    );
    const { rfq, response } = await cvg.rfqs().createAndFinalize({
      instruments: [
        new SpotInstrument(cvg, baseMint, {
          amount: 1.0,
          side: Side.Bid,
        }),
        new PsyoptionsEuropeanInstrument(
          cvg,
          baseMint,
          OptionType.CALL,
          euroMeta,
          euroMetaKey,
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
