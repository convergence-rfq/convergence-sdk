import { expect } from 'expect';

import { Mint, FixedSize } from '../../src';
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
    const { rfq } = await takerCvg.rfqs().create({
      legAsset: baseMintBTC.address,
      quoteAsset: quoteMint.address,
      orderType: 'buy',
      fixedSize,
      activeWindow: 3000,
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
});
