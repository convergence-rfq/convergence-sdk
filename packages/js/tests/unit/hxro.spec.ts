import { expect } from 'expect';
import { BN } from 'bn.js';

import { createUserCvg } from '../helpers';
import { HxroOptionInfo, HxroPrintTrade, PublicKey } from '../../src';

describe('unit.hxro', () => {
  const cvg = createUserCvg('taker');
  const cvg2 = createUserCvg('maker');

  it('get hxro config', async () => {
    const result = await cvg.hxro().fetchConfig();
    expect(result).toEqual({
      model: 'hxroPrintTradeProviderConfig',
      validMpg: new PublicKey('GCXr6LDZurWK8Hkm18gZzJ7jUgvrYEVFFeWUR346fd42'),
    });
  });

  it('get hxro products', async () => {
    const results = await cvg.hxro().fetchProducts();

    // BN comparison fails without it
    const optionProduct = results[1] as HxroOptionInfo;
    optionProduct.strikePrice.exp = optionProduct.strikePrice.exp.toString();

    expect(results).toEqual([
      {
        productIndex: 0,
        productAddress: new PublicKey(
          '3fw72yL2pG7cKmPs4TYJa6C9496NyypFpj5UQVLe515j'
        ),
        baseAssetIndex: 1,
        instrumentType: 'perp-future',
      },
      {
        productIndex: 1,
        productAddress: new PublicKey(
          '7a44aefJzrJ5t98s6vQqn53EobdCReaUiJoKSUVC77RK'
        ),
        baseAssetIndex: 1,
        instrumentType: 'option',
        optionType: 1,
        strikePrice: {
          m: new BN(122345),
          exp: '4',
        },
        expirationTimestamp: new BN(1748476800),
      },
    ]);
  });

  it('can create hxro rfq', async () => {
    const products = await cvg.hxro().fetchProducts();
    const { rfq } = await cvg.rfqs().createPrintTrade({
      printTrade: new HxroPrintTrade(cvg, [
        { amount: 1, side: 'long', productInfo: products[0] },
      ]),
      orderType: 'buy',
      fixedSize: { type: 'open' },
      activeWindow: 1000,
      settlingWindow: 5000,
    });

    const { rfqResponse } = await cvg2
      .rfqs()
      .respond({ rfq: rfq.address, ask: { price: 123, legsMultiplier: 1 } });
  });
});
