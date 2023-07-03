import { expect } from 'expect';
import { Side } from '@convergence-rfq/rfq';

import {
  Mint,
  SpotLegInstrument,
  SpotQuoteInstrument,
  FixedSize,
} from '../../src';
import { createUserCvg, getAll } from '../helpers';
import { BASE_MINT_BTC_PK, QUOTE_MINT_PK } from '../constants';

describe('unit.rfq', () => {
  const takerCvg = createUserCvg('taker');

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

  it('create', async () => {
    const fixedSize: FixedSize = {
      type: 'fixed-base',
      amount: 19.653_038_331,
    };
    const { rfq } = await takerCvg.rfqs().createAndFinalize({
      instruments: [
        await SpotLegInstrument.create(takerCvg, baseMintBTC, 5.12, Side.Bid),
      ],
      orderType: 'buy',
      quoteAsset: await SpotQuoteInstrument.create(takerCvg, quoteMint),
      fixedSize,
    });
    // @ts-ignore
    expect(fixedSize.amount).toBeCloseTo(rfq.size.amount);
  });

  it('create [size precision error]', async () => {
    const errors: string[] = [];
    const fixedSize: FixedSize = {
      type: 'fixed-base',
      amount: 19.653_038_331_093,
    };
    await takerCvg
      .rfqs()
      .createAndFinalize({
        instruments: [
          await SpotLegInstrument.create(takerCvg, baseMintBTC, 5, Side.Bid),
        ],
        orderType: 'buy',
        quoteAsset: await SpotQuoteInstrument.create(takerCvg, quoteMint),
        fixedSize,
      })
      .catch((e) => {
        errors.push(e.message);
      });
    expect(errors[0]).toBe('Precision lost when converting number to BN');
  });

  it('find all', async () => {
    const iterator: any = takerCvg.rfqs().findRfqs({});
    const rfqs = (await getAll(iterator)).flat();
    expect(rfqs.length).toBeGreaterThan(0);
  });

  it('find all [owner]', async () => {
    const iterator: any = takerCvg
      .rfqs()
      .findRfqs({ owner: takerCvg.identity().publicKey });
    const rfqs = (await getAll(iterator)).flat();
    expect(rfqs.length).toBeGreaterThan(0);
  });

  it('cancel, reclaim and cleanup multiple', async () => {
    const fixedSize: FixedSize = {
      type: 'fixed-base',
      amount: 19.6,
    };
    const { rfq: rfq1, response } = await takerCvg.rfqs().createAndFinalize({
      instruments: [
        await SpotLegInstrument.create(takerCvg, baseMintBTC, 5, Side.Bid),
      ],
      orderType: 'buy',
      quoteAsset: await SpotQuoteInstrument.create(takerCvg, quoteMint),
      fixedSize,
    });
    expect(response).toHaveProperty('signature');

    const { rfq: rfq2, response: response2 } = await takerCvg
      .rfqs()
      .createAndFinalize({
        instruments: [
          await SpotLegInstrument.create(takerCvg, baseMintBTC, 10, Side.Bid),
        ],
        orderType: 'buy',
        quoteAsset: await SpotQuoteInstrument.create(takerCvg, quoteMint),
        fixedSize,
      });
    expect(response2).toHaveProperty('signature');

    const { rfq: rfq3, response: response3 } = await takerCvg
      .rfqs()
      .createAndFinalize({
        instruments: [
          await SpotLegInstrument.create(takerCvg, baseMintBTC, 15, Side.Bid),
        ],
        orderType: 'buy',
        quoteAsset: await SpotQuoteInstrument.create(takerCvg, quoteMint),
        fixedSize,
      });
    expect(response3).toHaveProperty('signature');

    await takerCvg
      .rfqs()
      .cancelMultipleRfq({ rfqs: [rfq1.address, rfq2.address, rfq3.address] });

    await takerCvg.rfqs().unlockMultipleRfqCollateral({
      rfqs: [rfq1.address, rfq2.address, rfq3.address],
    });
    const refreshedRfq1 = await takerCvg
      .rfqs()
      .findRfqByAddress({ address: rfq1.address });
    const refreshedRfq2 = await takerCvg
      .rfqs()
      .findRfqByAddress({ address: rfq2.address });
    const refreshedRfq3 = await takerCvg
      .rfqs()
      .findRfqByAddress({ address: rfq3.address });
    await takerCvg.rfqs().cleanUpMultipleRfq({
      rfqs: [
        refreshedRfq1.address,
        refreshedRfq2.address,
        refreshedRfq3.address,
      ],
    });
  });
});
