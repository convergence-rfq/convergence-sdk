import {
  HxroAdditionalRespondData,
  HxroPrintTrade,
  PrintTrade,
} from '../../src';
import {
  createUserCvg,
  ensureHxroOperatorTRGInitialized,
  runInParallelWithWait,
  sleep,
} from '../helpers';
import { CTX } from '../constants';

describe('integration.hxro', () => {
  const cvgTaker = createUserCvg('taker');
  const cvgMaker = createUserCvg('maker');
  const cvgAuthority = createUserCvg('dao');

  let commonPrintTrade: PrintTrade;

  before(async () => {
    await ensureHxroOperatorTRGInitialized(cvgAuthority);
    const products = await cvgTaker.hxro().fetchProducts();
    commonPrintTrade = new HxroPrintTrade(cvgTaker, CTX.hxroTakerTrg, [
      { amount: 1, side: 'long', productInfo: products[0] },
    ]);
  });

  it('create, cancel and clean up', async () => {
    const { rfq } = await cvgTaker.rfqs().createPrintTrade({
      printTrade: commonPrintTrade,
      orderType: 'buy',
      fixedSize: { type: 'open' },
      activeWindow: 1000,
      settlingWindow: 5000,
    });
    await cvgTaker.rfqs().cancelRfq({ rfq: rfq.address });
    await cvgTaker.rfqs().unlockRfqCollateral({ rfq: rfq.address });
    await cvgTaker.rfqs().cleanUpRfq({ rfq: rfq.address });
  });

  it('create, wait for expire and clean up', async () => {
    const { rfq } = await cvgTaker.rfqs().createPrintTrade({
      printTrade: commonPrintTrade,
      orderType: 'buy',
      fixedSize: { type: 'open' },
      activeWindow: 1,
      settlingWindow: 5000,
    });
    await sleep(1.5);
    await cvgTaker.rfqs().unlockRfqCollateral({ rfq: rfq.address });
    await cvgTaker.rfqs().cleanUpRfq({ rfq: rfq.address });
  });

  it('create, respond, wait for expire and clean up', async () => {
    const { rfq } = await cvgTaker.rfqs().createPrintTrade({
      printTrade: commonPrintTrade,
      orderType: 'buy',
      fixedSize: { type: 'open' },
      activeWindow: 2,
      settlingWindow: 5000,
    });
    const { rfqResponse } = await runInParallelWithWait(
      () =>
        cvgMaker.rfqs().respond({
          rfq: rfq.address,
          ask: { price: 100, legsMultiplier: 1 },
          additionalData: new HxroAdditionalRespondData(CTX.hxroMakerTrg),
        }),
      2.5
    );

    await cvgMaker
      .rfqs()
      .unlockResponseCollateral({ response: rfqResponse.address });
    await cvgMaker.rfqs().cleanUpResponse({ response: rfqResponse.address });
    await cvgTaker.rfqs().unlockRfqCollateral({ rfq: rfq.address });
    await cvgTaker.rfqs().cleanUpRfq({ rfq: rfq.address });
  });

  it('settle and clean up', async () => {
    const { rfq } = await cvgTaker.rfqs().createPrintTrade({
      printTrade: commonPrintTrade,
      orderType: 'buy',
      fixedSize: { type: 'open' },
      activeWindow: 1000,
      settlingWindow: 5000,
    });

    const { rfqResponse } = await cvgMaker.rfqs().respond({
      rfq: rfq.address,
      ask: { price: 123, legsMultiplier: 1 },
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

    await cvgMaker.rfqs().preparePrintTradeSettlement({
      rfq: rfq.address,
      response: rfqResponse.address,
    });

    await cvgTaker.rfqs().settle({
      response: rfqResponse.address,
    });
    await cvgTaker
      .rfqs()
      .unlockResponseCollateral({ response: rfqResponse.address });
    await cvgTaker.rfqs().cleanUpResponse({ response: rfqResponse.address });
    await cvgTaker.rfqs().cancelRfq({ rfq: rfq.address });
    await cvgTaker.rfqs().cleanUpRfq({ rfq: rfq.address });
  });

  it('settle after settling window ends and clean up', async () => {
    const { rfq } = await cvgTaker.rfqs().createPrintTrade({
      printTrade: commonPrintTrade,
      orderType: 'buy',
      fixedSize: { type: 'open' },
      activeWindow: 3,
      settlingWindow: 1,
    });
    const rfqResponse = await runInParallelWithWait(async () => {
      const { rfqResponse } = await cvgMaker.rfqs().respond({
        rfq: rfq.address,
        ask: { price: 100, legsMultiplier: 1 },
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

      await cvgMaker.rfqs().preparePrintTradeSettlement({
        rfq: rfq.address,
        response: rfqResponse.address,
      });
      return rfqResponse;
    }, 4.5);

    await cvgTaker.rfqs().settle({
      response: rfqResponse.address,
    });
    await cvgTaker
      .rfqs()
      .unlockResponseCollateral({ response: rfqResponse.address });
    await cvgTaker.rfqs().cleanUpResponse({ response: rfqResponse.address });
    await cvgTaker.rfqs().cleanUpRfq({ rfq: rfq.address });
  });

  it('confirm, but taker defaults', async () => {
    const { rfq } = await cvgTaker.rfqs().createPrintTrade({
      printTrade: commonPrintTrade,
      orderType: 'buy',
      fixedSize: { type: 'open' },
      activeWindow: 3,
      settlingWindow: 1,
    });

    const rfqResponse = await runInParallelWithWait(async () => {
      const { rfqResponse } = await cvgMaker.rfqs().respond({
        rfq: rfq.address,
        ask: { price: 100, legsMultiplier: 1 },
        additionalData: new HxroAdditionalRespondData(CTX.hxroMakerTrg),
      });
      await cvgTaker.rfqs().confirmResponse({
        response: rfqResponse.address,
        rfq: rfq.address,
        side: 'ask',
      });

      await cvgMaker.rfqs().preparePrintTradeSettlement({
        rfq: rfq.address,
        response: rfqResponse.address,
      });

      return rfqResponse;
    }, 4.5);

    await cvgMaker.rfqs().revertSettlementPreparation({
      response: rfqResponse.address,
      side: 'maker',
    });

    await cvgMaker.rfqs().settleOnePartyDefault({
      response: rfqResponse.address,
      rfq: rfq.address,
    });
    await cvgMaker.rfqs().cleanUpResponse({ response: rfqResponse.address });
    await cvgTaker.rfqs().cleanUpRfq({ rfq: rfq.address });
  });

  it('confirm, but maker defaults', async () => {
    const { rfq } = await cvgTaker.rfqs().createPrintTrade({
      printTrade: commonPrintTrade,
      orderType: 'buy',
      fixedSize: { type: 'open' },
      activeWindow: 3,
      settlingWindow: 1,
    });

    const rfqResponse = await runInParallelWithWait(async () => {
      const { rfqResponse } = await cvgMaker.rfqs().respond({
        rfq: rfq.address,
        ask: { price: 100, legsMultiplier: 1 },
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

      return rfqResponse;
    }, 4.5);

    await cvgTaker.rfqs().revertSettlementPreparation({
      response: rfqResponse.address,
      side: 'taker',
    });

    await cvgTaker.rfqs().settleOnePartyDefault({
      response: rfqResponse.address,
      rfq: rfq.address,
    });
    await cvgMaker.rfqs().cleanUpResponse({ response: rfqResponse.address });
    await cvgTaker.rfqs().cleanUpRfq({ rfq: rfq.address });
  });

  it('confirm, but both default', async () => {
    const { rfq } = await cvgTaker.rfqs().createPrintTrade({
      printTrade: commonPrintTrade,
      orderType: 'buy',
      fixedSize: { type: 'open' },
      activeWindow: 3,
      settlingWindow: 1,
    });

    const rfqResponse = await runInParallelWithWait(async () => {
      const { rfqResponse } = await cvgMaker.rfqs().respond({
        rfq: rfq.address,
        ask: { price: 100, legsMultiplier: 1 },
        additionalData: new HxroAdditionalRespondData(CTX.hxroMakerTrg),
      });
      await cvgTaker.rfqs().confirmResponse({
        response: rfqResponse.address,
        rfq: rfq.address,
        side: 'ask',
      });

      return rfqResponse;
    }, 4.5);

    await cvgTaker.rfqs().settleTwoPartyDefault({
      response: rfqResponse.address,
      rfq: rfq.address,
    });
    await cvgMaker.rfqs().cleanUpResponse({ response: rfqResponse.address });
    await cvgTaker.rfqs().cleanUpRfq({ rfq: rfq.address });
  });
});
