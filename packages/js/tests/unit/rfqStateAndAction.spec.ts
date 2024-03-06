import { expect } from 'expect';
import {
  Mint,
  SpotLegInstrument,
  SpotQuoteInstrument,
  FixedSize,
  Rfq,
} from '../../src';
import { createUserCvg, sleep } from '../helpers';
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
      amount: 19.65,
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
      amount: 12.122,
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
    ).toBe('ViewResponses');
  });

  it('[UnlockCollateral,Cleanup] when rfq is expired', async () => {
    const fixedSize: FixedSize = {
      type: 'fixed-base',
      amount: 1,
    };
    const { rfq } = await takerCvg.rfqs().createAndFinalize({
      instruments: [
        await SpotLegInstrument.create(takerCvg, baseMintBTC, 12.1, 'long'),
      ],
      orderType: 'sell',
      quoteAsset: await SpotQuoteInstrument.create(takerCvg, quoteMint),
      activeWindow: 3,
      settlingWindow: 3,
      fixedSize,
    });

    await sleep(4);

    //Cleanup for taker
    expect(
      takerCvg.rfqs().getRfqStateAndAction({
        rfq,
        caller: 'taker',
      }).rfqAction
    ).toBe('Cleanup');
  });
});
