import { expect } from 'expect';
import { PublicKey, Keypair } from '@solana/web3.js';
import * as anchor from '@project-serum/anchor';

import { Ctx } from '../../../validator';
import { createSdk, createPriceFeed } from '../helpers';
import { IDL as PseudoPythIdl } from '../../../validator/fixtures/programs/pseudo_pyth_idl';
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
  const ctx = new Ctx();
  const takerCvg = createSdk('taker');

  let baseMint: Mint;
  let quoteMint: Mint;

  before(async () => {
    baseMint = await takerCvg
      .tokens()
      .findMintByAddress({ address: new PublicKey(ctx.baseMint) });
    quoteMint = await takerCvg
      .tokens()
      .findMintByAddress({ address: new PublicKey(ctx.quoteMint) });
  });

  it('covered call', async () => {
    const europeanProgram = await createEuropeanProgram(takerCvg);
    const provider = new anchor.AnchorProvider(
      takerCvg.connection,
      new anchor.Wallet(takerCvg.rpc().getDefaultFeePayer() as Keypair),
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
      takerCvg,
      oracle,
      europeanProgram,
      baseMint,
      quoteMint,
      23_354,
      1,
      3_600,
      0
    );
    const { rfq, response } = await takerCvg.rfqs().createAndFinalize({
      instruments: [
        new SpotInstrument(takerCvg, baseMint, {
          amount: 1.0,
          side: Side.Bid,
        }),
        new PsyoptionsEuropeanInstrument(
          takerCvg,
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
      quoteAsset: new SpotInstrument(takerCvg, quoteMint).toQuoteAsset(),
    });
    expect(rfq).toHaveProperty('address');
    expect(response.signature).toBeDefined();
  });
});
