import { expect } from 'expect';
import {
  Mint,
  SpotLegInstrument,
  SpotQuoteInstrument,
  FixedSize,
  Rfq,
} from '../../src';
import { createUserCvg } from '../helpers';
import { BASE_MINT_BTC_PK, QUOTE_MINT_PK } from '../constants';

describe('unit.rfqStateAndAction', () => {
  const takerCvg = createUserCvg('taker');
  const makerCvg = createUserCvg('maker');

  let baseMintBTC: Mint;
  let quoteMint: Mint;

  before(async () => {
    baseMintBTC = await takerCvg
      .tokens()
      .findMintByAddress({ address: BASE_MINT_BTC_PK });
    quoteMint = await takerCvg
      .tokens()
      .findMintByAddress({ address: QUOTE_MINT_PK });
  });

  it('[Cancel, UnlockCollateral, Cleanup, Respond, Null]', async () => {
    let refreshedRfq: Rfq;
    const fixedSize: FixedSize = {
      type: 'fixed-base',
      amount: 19.653_038_331,
    };
    const { rfq } = await takerCvg.rfqs().createAndFinalize({
      instruments: [
        await SpotLegInstrument.create(takerCvg, baseMintBTC, 5.12, 'long'),
      ],
      orderType: 'sell',
      quoteAsset: await SpotQuoteInstrument.create(takerCvg, quoteMint),
      fixedSize,
    });

    //Cancel for taker
    expect(
      takerCvg.rfqs().getRfqStateAndAction({
        rfq,
        caller: 'taker',
      }).rfqAction
    ).toBe('Cancel');

    // Respond for maker
    expect(
      takerCvg.rfqs().getRfqStateAndAction({
        rfq,
        caller: 'maker',
      }).rfqAction
    ).toBe('Respond');

    await takerCvg.rfqs().cancelRfq({ rfq: rfq.address });
    refreshedRfq = await makerCvg.rfqs().findRfqByAddress({
      address: rfq.address,
    });

    //UnlockCollateral for taker
    expect(
      takerCvg.rfqs().getRfqStateAndAction({
        rfq: refreshedRfq,
        caller: 'taker',
      }).rfqAction
    ).toBe('UnlockCollateral');

    //null for maker
    expect(
      takerCvg.rfqs().getRfqStateAndAction({
        rfq: refreshedRfq,
        caller: 'maker',
      }).rfqAction
    ).toBe(null);

    await takerCvg.rfqs().unlockRfqCollateral({
      rfq: rfq.address,
    });
    refreshedRfq = await makerCvg.rfqs().findRfqByAddress({
      address: rfq.address,
    });

    //Cleanup for taker
    expect(
      takerCvg.rfqs().getRfqStateAndAction({
        rfq: refreshedRfq,
        caller: 'taker',
      }).rfqAction
    ).toBe('Cleanup');
  });

  it('[FinalizeConstruction, Responses]', async () => {
    let refreshedRfq: Rfq;
    const fixedSize: FixedSize = {
      type: 'fixed-base',
      amount: 19.653_038_331,
    };
    const { rfq } = await takerCvg.rfqs().create({
      instruments: [
        await SpotLegInstrument.create(takerCvg, baseMintBTC, 5.12, 'long'),
      ],
      orderType: 'sell',
      quoteAsset: await SpotQuoteInstrument.create(takerCvg, quoteMint),
      fixedSize,
    });

    //FinalizeConstruction for taker
    expect(
      takerCvg.rfqs().getRfqStateAndAction({
        rfq,
        caller: 'taker',
      }).rfqAction
    ).toBe('FinalizeConstruction');

    await takerCvg.rfqs().finalizeRfqConstruction({
      rfq: rfq.address,
    });
    refreshedRfq = await takerCvg
      .rfqs()
      .findRfqByAddress({ address: rfq.address });

    //Cancel for taker
    expect(
      takerCvg.rfqs().getRfqStateAndAction({
        rfq: refreshedRfq,
        caller: 'taker',
      }).rfqAction
    ).toBe('Cancel');

    await makerCvg.rfqs().respond({
      rfq: rfq.address,
      bid: {
        price: 12000,
      },
    });

    refreshedRfq = await takerCvg.rfqs().findRfqByAddress({
      address: rfq.address,
    });

    //Responses for taker
    expect(
      takerCvg.rfqs().getRfqStateAndAction({
        rfq: refreshedRfq,
        caller: 'taker',
      }).rfqAction
    ).toBe('NewResponses');
  });
});
