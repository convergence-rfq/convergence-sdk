import { expect } from 'expect';

import { Keypair } from '@solana/web3.js';
import { createUserCvg, ensureHxroOperatorTRGInitialized } from '../helpers';
import { HxroPrintTrade, HxroLeg, PublicKey } from '../../src';
import { CTX } from '../constants';

describe('unit.hxro', () => {
  const cvgTaker = createUserCvg('taker');
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
          '8qBD1ZewtfoxNAy3E45f5fRtwQUhLku55cVVxT5cMPef'
        ),
        baseAssetIndex: 1,
        instrumentType: 'perp-future',
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

  it('can overwrite print trade with whole product data', async () => {
    await ensureHxroOperatorTRGInitialized(cvgAuthority);

    const products = await cvgTaker.hxro().fetchProducts();
    const { rfq } = await cvgTaker.rfqs().createPrintTrade({
      printTrade: new HxroPrintTrade(cvgTaker, CTX.hxroTakerTrg, [
        { amount: 1, side: 'long', productInfo: products[0] },
      ]),
      orderType: 'buy',
      fixedSize: { type: 'open' },
      activeWindow: 1000,
      settlingWindow: 5000,
    });

    expect(
      (rfq.legs[0] as HxroLeg).legInfo.productInfo.productAddress
    ).toBeUndefined();
    (rfq.printTrade as HxroPrintTrade).overwriteWithFullHxroProductData(
      products
    );
    expect(
      (rfq.legs[0] as HxroLeg).legInfo.productInfo.productAddress
    ).toBeDefined();
  });
});
