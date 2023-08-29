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

describe('unit.rfqState', () => {
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

  it('[Kill, Reclaim, Cleanup, Respond, None]', async () => {
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

    //Kill for taker
    expect(
      takerCvg.rfqs().getRfqState({
        rfq,
        caller: 'taker',
      }).rfqState
    ).toBe('Kill');

    // Respond for maker
    expect(
      takerCvg.rfqs().getRfqState({
        rfq,
        caller: 'maker',
      }).rfqState
    ).toBe('Respond');

    await takerCvg.rfqs().cancelRfq({ rfq: rfq.address });
    refreshedRfq = await makerCvg.rfqs().findRfqByAddress({
      address: rfq.address,
    });

    //Reclaim for taker
    expect(
      takerCvg.rfqs().getRfqState({
        rfq: refreshedRfq,
        caller: 'taker',
      }).rfqState
    ).toBe('Reclaim');

    //None for maker
    expect(
      takerCvg.rfqs().getRfqState({
        rfq: refreshedRfq,
        caller: 'maker',
      }).rfqState
    ).toBe('None');

    await takerCvg.rfqs().unlockRfqCollateral({
      rfq: rfq.address,
    });
    refreshedRfq = await makerCvg.rfqs().findRfqByAddress({
      address: rfq.address,
    });

    //Cleanup for taker
    expect(
      takerCvg.rfqs().getRfqState({
        rfq: refreshedRfq,
        caller: 'taker',
      }).rfqState
    ).toBe('Cleanup');
  });

  it('[Resubmit, Responses]', async () => {
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

    //Resubmit for taker
    expect(
      takerCvg.rfqs().getRfqState({
        rfq,
        caller: 'taker',
      }).rfqState
    ).toBe('Resubmit');

    await takerCvg.rfqs().finalizeRfqConstruction({
      rfq: rfq.address,
    });
    refreshedRfq = await takerCvg
      .rfqs()
      .findRfqByAddress({ address: rfq.address });

    //Kill for taker
    expect(
      takerCvg.rfqs().getRfqState({
        rfq: refreshedRfq,
        caller: 'taker',
      }).rfqState
    ).toBe('Kill');

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
      takerCvg.rfqs().getRfqState({
        rfq: refreshedRfq,
        caller: 'taker',
      }).rfqState
    ).toBe('Responses');
  });
});
