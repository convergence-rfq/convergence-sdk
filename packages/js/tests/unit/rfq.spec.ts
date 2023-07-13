import { expect } from 'expect';

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
        await SpotLegInstrument.create(takerCvg, baseMintBTC, 5.12, 'long'),
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
          await SpotLegInstrument.create(takerCvg, baseMintBTC, 5, 'long'),
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

  it('cancel', async () => {
    const iterator: any = takerCvg.rfqs().findRfqs({});
    const rfqs = (await getAll(iterator)).flat().filter((rfq: any) => {
      return rfq.state === 'active' && rfq.totalResponses === 0;
    });
    expect(rfqs.length).toBeGreaterThan(0);
    const { responses } = await takerCvg
      .rfqs()
      .cancelRfqs({ rfqs: rfqs.map((rfq: any) => rfq.address) });
    expect(responses.length).toBe(rfqs.length);
  });

  it('unlock', async () => {
    const iterator: any = takerCvg.rfqs().findRfqs({});
    const rfqs = (await getAll(iterator)).flat().filter((rfq: any) => {
      return rfq.state === 'canceled' && rfq.totalResponses === 0;
    });
    expect(rfqs.length).toBeGreaterThan(0);
    const responses = await Promise.all(
      rfqs.map((rfq: any) =>
        takerCvg.rfqs().unlockRfqCollateral({
          rfq: rfq.address,
        })
      )
    );
    responses.map(({ response }) =>
      expect(response).toHaveProperty('signature')
    );
  });

  it('clean up', async () => {
    const iterator: any = takerCvg.rfqs().findRfqs({});
    const rfqs = (await getAll(iterator)).flat().filter((rfq: any) => {
      return rfq.state === 'canceled';
    });
    expect(rfqs.length).toBeGreaterThan(0);
    await takerCvg.rfqs().cleanUpRfqs({
      rfqs: rfqs.map((rfq: any) => rfq.address),
    });
  });
});
