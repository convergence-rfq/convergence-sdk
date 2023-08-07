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

  // TODO ADD getRfqState function
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
    const rfqsBefore = (await getAll(iterator)).flat().filter((rfq: any) => {
      return rfq.state === 'canceled' && rfq.totalResponses === 0;
    });
    expect(rfqsBefore.length).toBeGreaterThan(0);
    const { responses } = await takerCvg.rfqs().unlockRfqsCollateral({
      rfqs: rfqsBefore.map((rfq: any) => rfq.address),
    });
    expect(responses.length).toBe(rfqsBefore.length);
    const rfqsAfter = (await getAll(iterator)).flat().filter((rfq: any) => {
      return rfq.state === 'canceled' && rfq.totalResponses === 0;
    });
    rfqsAfter.map((rfq: any) => {
      expect(rfq.totalTakerCollateralLocked).toBe(0);
    });
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
