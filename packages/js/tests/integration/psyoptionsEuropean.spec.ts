import { expect } from 'expect';
import { PublicKey, Keypair } from '@solana/web3.js';
import * as anchor from '@project-serum/anchor';

import { createUserCvg } from '../helpers';
import { QUOTE_MINT_PK, BASE_MINT_PK } from '../constants';
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
  getOrCreateEuropeanOptionATAs,
  mintEuropeanOptions,
  ATAExistence,
} from '../../src';
import {
  confirmResponse,
  createPythPriceFeed,
  prepareSettlement,
  respond,
  settle,
} from '../human';

describe('psyoptions european', () => {
  const takerCvg = createUserCvg('taker');
  const makerCvg = createUserCvg('maker');

  let baseMint: Mint;
  let quoteMint: Mint;

  before(async () => {
    baseMint = await takerCvg
      .tokens()
      .findMintByAddress({ address: BASE_MINT_PK });
    quoteMint = await takerCvg
      .tokens()
      .findMintByAddress({ address: QUOTE_MINT_PK });
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
    const oracle = await createPythPriceFeed(
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

  it('mint european options', async () => {
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
    const oracle = await createPythPriceFeed(
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
            amount: 1,
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
    const { rfqResponse } = await respond(makerCvg, rfq, 'bid');
    await confirmResponse(takerCvg, rfq, rfqResponse, 'bid');
    const exists = await getOrCreateEuropeanOptionATAs(
      takerCvg,
      rfqResponse.address,
      takerCvg.rpc().getDefaultFeePayer().publicKey
    );

    if (exists === ATAExistence.EXISTS) {
      const tnx = await mintEuropeanOptions(
        takerCvg,
        rfqResponse.address,
        takerCvg.rpc().getDefaultFeePayer().publicKey,
        europeanProgram
      );
      if (tnx) {
        expect(tnx).toHaveProperty('response');
      }
    }

    await prepareSettlement(makerCvg, rfq, rfqResponse);
    await prepareSettlement(takerCvg, rfq, rfqResponse);

    await settle(takerCvg, rfq, rfqResponse);
  });
});
