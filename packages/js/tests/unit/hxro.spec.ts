import { expect } from 'expect';

import { Keypair } from '@solana/web3.js';
import { createUserCvg, ensureHxroOperatorTRGInitialized } from '../helpers';
import {
  HxroPrintTrade,
  HxroLeg,
  PublicKey,
  HxroAdditionalRespondData,
} from '../../src';
import { CTX } from '../constants';

describe('unit.hxro', () => {
  const cvgTaker = createUserCvg('taker');
  const cvgMaker = createUserCvg('maker');
  const cvgAuthority = createUserCvg('dao');

  before(async () => {
    await ensureHxroOperatorTRGInitialized(cvgAuthority);
  });

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
        productName: 'product        0',
      },
      {
        productIndex: 1,
        productAddress: new PublicKey(
          '8qBD1ZewtfoxNAy3E45f5fRtwQUhLku55cVVxT5cMPef'
        ),
        baseAssetIndex: 1,
        instrumentType: 'perp-future',
        productName: 'product        1',
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

  it('revert preparation by the same cvg party automatically removes a lock', async () => {
    const products = await cvgTaker.hxro().fetchProducts();
    const { rfq } = await cvgTaker.rfqs().createPrintTrade({
      printTrade: new HxroPrintTrade(cvgTaker, CTX.hxroTakerTrg, [
        { amount: 1, side: 'long', productInfo: products[0] },
      ]),
      orderType: 'buy',
      fixedSize: { type: 'fixed-base', amount: 100 },
      activeWindow: 3600,
      settlingWindow: 3600,
    });

    const { rfqResponse } = await cvgMaker.rfqs().respond({
      rfq: rfq.address,
      ask: { price: 100 },
      additionalData: new HxroAdditionalRespondData(CTX.hxroMakerTrg),
    });
    await cvgTaker.rfqs().confirmResponse({
      response: rfqResponse.address,
      rfq: rfq.address,
      side: 'ask',
    });

    await cvgTaker.rfqs().preparePrintTradeSettlement({
      rfq: rfq.address,
      response: rfqResponse.address,
    });
    await cvgTaker.hxro().unlockCollateralByRecord({
      lockRecord: cvgTaker
        .hxro()
        .pdas()
        .lockedCollateralRecord(
          cvgTaker.identity().publicKey,
          rfqResponse.address
        ),
      action: 'unlock',
    });
    await cvgMaker.rfqs().preparePrintTradeSettlement({
      rfq: rfq.address,
      response: rfqResponse.address,
    });
    await cvgMaker.rfqs().settle({
      response: rfqResponse.address,
    });

    await cvgMaker.rfqs().settleOnePartyDefault({
      rfq: rfq.address,
      response: rfqResponse.address,
    });

    await cvgMaker.rfqs().revertSettlementPreparation({
      response: rfqResponse.address,
      side: 'maker',
    });

    const lockAddress = cvgMaker
      .hxro()
      .pdas()
      .lockedCollateralRecord(
        cvgMaker.identity().publicKey,
        rfqResponse.address
      );
    const lockData = await cvgMaker.connection.getAccountInfo(lockAddress);
    expect(lockData).toBeNull();
  });

  it('can fetch an unused lock', async () => {
    const products = await cvgTaker.hxro().fetchProducts();
    const { rfq } = await cvgTaker.rfqs().createPrintTrade({
      printTrade: new HxroPrintTrade(cvgTaker, CTX.hxroTakerTrg, [
        { amount: 1, side: 'long', productInfo: products[0] },
      ]),
      orderType: 'buy',
      fixedSize: { type: 'fixed-base', amount: 100 },
      activeWindow: 3600,
      settlingWindow: 3600,
    });

    const { rfqResponse } = await cvgMaker.rfqs().respond({
      rfq: rfq.address,
      ask: { price: 100 },
      additionalData: new HxroAdditionalRespondData(CTX.hxroMakerTrg),
    });
    await cvgTaker.rfqs().confirmResponse({
      response: rfqResponse.address,
      rfq: rfq.address,
      side: 'ask',
    });

    await cvgTaker.rfqs().preparePrintTradeSettlement({
      rfq: rfq.address,
      response: rfqResponse.address,
    });
    await cvgTaker.hxro().unlockCollateralByRecord({
      lockRecord: cvgTaker
        .hxro()
        .pdas()
        .lockedCollateralRecord(
          cvgTaker.identity().publicKey,
          rfqResponse.address
        ),
      action: 'unlock',
    });
    await cvgMaker.rfqs().preparePrintTradeSettlement({
      rfq: rfq.address,
      response: rfqResponse.address,
    });
    await cvgMaker.rfqs().settle({
      response: rfqResponse.address,
    });

    await cvgMaker.rfqs().settleOnePartyDefault({
      rfq: rfq.address,
      response: rfqResponse.address,
    });

    await cvgMaker.rfqs().revertSettlementPreparation({
      response: rfqResponse.address,
      side: 'taker',
    });

    const lockKeys = (
      await cvgTaker.hxro().fetchUnusedCollateralLockRecords()
    ).map((lock) => lock.publicKey);
    const expectedKey = cvgTaker
      .hxro()
      .pdas()
      .lockedCollateralRecord(
        cvgTaker.identity().publicKey,
        rfqResponse.address
      );

    expect(lockKeys.find((key) => key.equals(expectedKey))).toBeTruthy();
  });
});
