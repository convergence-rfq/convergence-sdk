import { expect } from 'expect';
import { PublicKey, Keypair } from '@solana/web3.js';
import * as anchor from '@project-serum/anchor';

import { EuroPrimitive } from '@mithraic-labs/tokenized-euros';

import { QUOTE_MINT_PK, BASE_MINT_BTC_PK } from '../constants';
import {
  IDL as PseudoPythIdl,
  Pyth,
} from '../../../validator/fixtures/programs/pseudo_pyth_idl';
import {
  OrderType,
  OptionType,
  PsyoptionsEuropeanInstrument,
  Side,
  Mint,
  initializeNewOptionMeta,
  createEuropeanProgram,
  getOrCreateEuropeanOptionATAs,
  mintEuropeanOptions,
  SpotQuoteInstrument,
  SpotLegInstrument,
} from '../../src';
import {
  createPythPriceFeed,
  prepareRfqSettlement,
  respondToRfq,
  settleRfq,
  createUserCvg,
} from '../helpers';

describe('integration.psyoptionsEuropean', async () => {
  const takerCvg = createUserCvg('taker');
  const makerCvg = createUserCvg('maker');

  let pseudoPythProgram: anchor.Program<Pyth>;
  let oracle: PublicKey;

  let baseMint: Mint;
  let quoteMint: Mint;

  before(async () => {
    baseMint = await takerCvg
      .tokens()
      .findMintByAddress({ address: BASE_MINT_BTC_PK });
    quoteMint = await takerCvg
      .tokens()
      .findMintByAddress({ address: QUOTE_MINT_PK });
  });

  it('covered call [sell]', async () => {
    const europeanProgram = await createEuropeanProgram(takerCvg);
    const provider = new anchor.AnchorProvider(
      takerCvg.connection,
      new anchor.Wallet(takerCvg.rpc().getDefaultFeePayer() as Keypair),
      {}
    );
    pseudoPythProgram = new anchor.Program(
      PseudoPythIdl,
      new PublicKey('FsJ3A3u2vn5cTVofAjvy6y5kwABJAqYWpe4975bi2epH'),
      provider
    );
    oracle = await createPythPriceFeed(
      pseudoPythProgram,
      17_000,
      quoteMint.decimals * -1
    );
    const min = 3_600;
    const randomExpiry = min + Math.random();
    const { euroMeta, euroMetaKey } = await initializeNewOptionMeta(
      takerCvg,
      oracle,
      europeanProgram,
      baseMint,
      quoteMint,
      23_354,
      1,
      randomExpiry,
      0
    );

    const { rfq, response } = await takerCvg.rfqs().createAndFinalize({
      instruments: [
        await SpotLegInstrument.create(takerCvg, baseMint, 1.0, Side.Bid),
        await PsyoptionsEuropeanInstrument.create(
          takerCvg,
          baseMint,
          OptionType.CALL,
          euroMeta,
          euroMetaKey,
          1,
          Side.Bid
        ),
      ],
      orderType: OrderType.Sell,
      fixedSize: { __kind: 'BaseAsset', legsMultiplierBps: 1 },
      quoteAsset: await SpotQuoteInstrument.create(takerCvg, quoteMint),
    });
    expect(rfq).toHaveProperty('address');
    expect(response.signature).toBeDefined();

    const { rfqResponse } = await respondToRfq(makerCvg, rfq, 12.0, Side.Bid);
    await takerCvg.rfqs().confirmResponse({
      rfq: rfq.address,
      response: rfqResponse.address,
      side: Side.Bid,
    });

    await getOrCreateEuropeanOptionATAs(
      takerCvg,
      rfqResponse.address,
      takerCvg.rpc().getDefaultFeePayer().publicKey
    );
    const tnx = await mintEuropeanOptions(
      takerCvg,
      rfqResponse.address,
      takerCvg.rpc().getDefaultFeePayer().publicKey,
      europeanProgram
    );
    expect(tnx).toHaveProperty('response');

    await prepareRfqSettlement(makerCvg, rfq, rfqResponse);
    await prepareRfqSettlement(takerCvg, rfq, rfqResponse);

    await settleRfq(takerCvg, rfq, rfqResponse);
  });
});
