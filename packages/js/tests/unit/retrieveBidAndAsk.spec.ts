import expect from 'expect';
import { createRfq, createUserCvg } from '../helpers';

describe('unit.retrieveBidAndAsk', () => {
  const takerCvg = createUserCvg('taker');

  it('fixed-base [buy]', async () => {
    const baseAmount = 2.556;
    const quoteAmount = Number((24_300.75 * baseAmount).toFixed(6));

    const { rfq } = await createRfq(takerCvg, baseAmount, 'buy');
    expect(rfq).toHaveProperty('address');

    const bidAndAsk = takerCvg.rfqs().retrieveBidAndAsk({
      rfq,
      ask: {
        price: quoteAmount,
        legsMultiplier: null,
      },
      bid: {
        price: quoteAmount,
        legsMultiplier: 100,
      },
    });

    expect(bidAndAsk).toEqual({
      calculatedAsk: { price: 62112.717 },
      calculatedBid: null,
    });
  });

  it('fixed-base [2-way]', async () => {
    const baseAmount = 0.556;
    const quoteAmount = Number((1_300.75 * baseAmount).toFixed(6));

    const { rfq } = await createRfq(takerCvg, baseAmount, 'two-way');
    expect(rfq).toHaveProperty('address');

    const bidAndAsk = takerCvg.rfqs().retrieveBidAndAsk({
      rfq,
      ask: {
        price: quoteAmount,
        legsMultiplier: null,
      },
      bid: {
        price: quoteAmount + 1000,
        legsMultiplier: null,
      },
    });

    expect(bidAndAsk).toEqual({
      calculatedAsk: { price: 723.217 },
      calculatedBid: { price: 1723.217 },
    });
  });

  it('fixed-base [sell]', async () => {
    const baseAmount = 0.556;
    const quoteAmount = Number((1_300.75 * baseAmount).toFixed(6));

    const { rfq } = await createRfq(takerCvg, baseAmount, 'sell');
    expect(rfq).toHaveProperty('address');

    const bidAndAsk = takerCvg.rfqs().retrieveBidAndAsk({
      rfq,
      ask: {
        price: quoteAmount,
        legsMultiplier: null,
      },
      bid: {
        price: quoteAmount + 1000,
        legsMultiplier: null,
      },
    });

    expect(bidAndAsk).toEqual({
      calculatedAsk: null,
      calculatedBid: { price: 1723.217 },
    });
  });

  it('open-size [2-way]', async () => {
    const baseAmount = 0.556;
    const quoteAmount = Number((1_300.75 * baseAmount).toFixed(6));

    const { rfq } = await createRfq(takerCvg, baseAmount, 'two-way', 'open');
    expect(rfq).toHaveProperty('address');

    const bidAndAsk = takerCvg.rfqs().retrieveBidAndAsk({
      rfq,
      ask: {
        price: quoteAmount,
        legsMultiplier: 10,
      },
      bid: {
        price: quoteAmount + 3000,
        legsMultiplier: 20,
      },
    });

    expect(bidAndAsk).toEqual({
      calculatedAsk: { price: 72.3217, legsMultiplier: 10 },
      calculatedBid: { price: 186.16085, legsMultiplier: 20 },
    });
  });
});
