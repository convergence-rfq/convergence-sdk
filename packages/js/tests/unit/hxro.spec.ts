import { expect } from 'expect';
import { BN } from 'bn.js';

import { Keypair } from '@solana/web3.js';
import { createUserCvg } from '../helpers';
import { HxroOptionInfo, HxroPrintTrade, PublicKey } from '../../src';

describe('unit.hxro', () => {
  const cvgTaker = createUserCvg('taker');
  const cvgMaker = createUserCvg('maker');
  const cvgAuthority = createUserCvg('dao');

  it('get hxro config', async () => {
    const result = await cvgTaker.hxro().fetchConfig();
    expect(result).toEqual({
      model: 'hxroPrintTradeProviderConfig',
      address: cvgTaker.hxro().pdas().config(),
      validMpg: new PublicKey('GCXr6LDZurWK8Hkm18gZzJ7jUgvrYEVFFeWUR346fd42'),
    });
  });

  it('get hxro products', async () => {
    const results = await cvgTaker.hxro().fetchProducts();

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

  it('can modify hxro config', async () => {
    const randomKey = new Keypair().publicKey;
    const { validMpg: oldMpg } = await cvgAuthority.hxro().fetchConfig();
    await cvgAuthority.hxro().modifyConfig({ validMpg: randomKey });
    const { validMpg } = await cvgAuthority.hxro().fetchConfig();
    expect(validMpg).toEqual(randomKey);

    // set back
    await cvgAuthority.hxro().modifyConfig({ validMpg: oldMpg });
  });

  it('can create hxro rfq', async () => {
    const products = await cvgTaker.hxro().fetchProducts();
    const { rfq } = await cvgTaker.rfqs().createPrintTrade({
      printTrade: new HxroPrintTrade(cvgTaker, [
        { amount: 1, side: 'long', productInfo: products[0] },
      ]),
      orderType: 'buy',
      fixedSize: { type: 'open' },
      activeWindow: 1000,
      settlingWindow: 5000,
    });

    await cvgMaker
      .rfqs()
      .respond({ rfq: rfq.address, ask: { price: 123, legsMultiplier: 1 } });
  });
});
