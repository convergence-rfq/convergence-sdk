import expect from 'expect';
import { Mint } from '../../src';
import {
  applySpotQuoteFee,
  createUserCvg,
  fetchTokenAmount,
  runInParallelWithWait,
  sleep,
} from '../helpers';
import { BASE_MINT_BTC_PK, QUOTE_MINT_PK } from '../constants';

describe('integration.vaultOperator', () => {
  const takerCvg = createUserCvg('taker');
  const makerCvg = createUserCvg('maker');
  const executorCvg = createUserCvg('dao'); // any user actually

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

  it('sell', async () => {
    const [takerBtcBefore, takerQuoteBefore] = await Promise.all([
      fetchTokenAmount(takerCvg, baseMintBTC.address),
      fetchTokenAmount(takerCvg, quoteMint.address),
    ]);

    const responsePrice = 52000;
    const size = 2;

    const { vaultAddress } = await takerCvg.vaultOperator().create({
      acceptablePriceLimit: 50000,
      legMint: baseMintBTC,
      quoteMint,
      orderDetails: {
        type: 'sell',
        legAmount: size,
      },
      activeWindow: 600,
      settlingWindow: 600,
    });

    const { vault, rfq } = await takerCvg
      .vaultOperator()
      .findByAddress({ address: vaultAddress });

    const { rfqResponse: response } = await makerCvg
      .rfqs()
      .respond({ rfq: rfq.address, bid: { price: responsePrice } });
    const { vault: updatedVault } = await executorCvg
      .vaultOperator()
      .confirmAndPrepare({ vault, rfq, response });
    await makerCvg.rfqs().prepareSettlement({
      response: response.address,
      rfq: rfq.address,
      legAmountToPrepare: 1,
    });
    await makerCvg.rfqs().settle({
      response: response.address,
    });
    await executorCvg.rfqs().cleanUpResponse({ response: response.address });

    await executorCvg
      .vaultOperator()
      .withdrawTokens({ vault: updatedVault, rfq });

    const [takerBtcAfter, takerQuoteAfter] = await Promise.all([
      fetchTokenAmount(takerCvg, baseMintBTC.address),
      fetchTokenAmount(takerCvg, quoteMint.address),
    ]);

    expect(takerQuoteAfter).toBeCloseTo(
      takerQuoteBefore + applySpotQuoteFee(responsePrice * size)
    );
    expect(takerBtcAfter).toBeCloseTo(takerBtcBefore - size);
  });

  it('buy', async () => {
    const [takerBtcBefore, takerQuoteBefore] = await Promise.all([
      fetchTokenAmount(takerCvg, baseMintBTC.address),
      fetchTokenAmount(takerCvg, quoteMint.address),
    ]);

    const responsePrice = 40000;
    const quoteSize = 80000;

    const { vaultAddress } = await takerCvg.vaultOperator().create({
      acceptablePriceLimit: 40000,
      legMint: baseMintBTC,
      quoteMint,
      orderDetails: {
        type: 'buy',
        quoteAmount: quoteSize,
      },
      activeWindow: 600,
      settlingWindow: 600,
    });

    const { vault, rfq } = await takerCvg
      .vaultOperator()
      .findByAddress({ address: vaultAddress });

    const { rfqResponse: response } = await makerCvg
      .rfqs()
      .respond({ rfq: rfq.address, ask: { price: responsePrice } });
    const { vault: updatedVault } = await executorCvg
      .vaultOperator()
      .confirmAndPrepare({ vault, rfq, response });
    await makerCvg.rfqs().prepareSettlement({
      response: response.address,
      rfq: rfq.address,
      legAmountToPrepare: 1,
    });
    await executorCvg.rfqs().settle({
      response: response.address,
    });
    await executorCvg.rfqs().cleanUpResponse({ response: response.address });

    await executorCvg
      .vaultOperator()
      .withdrawTokens({ vault: updatedVault, rfq });

    const [takerBtcAfter, takerQuoteAfter] = await Promise.all([
      fetchTokenAmount(takerCvg, baseMintBTC.address),
      fetchTokenAmount(takerCvg, quoteMint.address),
    ]);

    expect(takerQuoteAfter).toBeCloseTo(takerQuoteBefore - quoteSize);
    expect(takerBtcAfter).toBeCloseTo(
      takerBtcBefore + quoteSize / responsePrice
    );
  });

  it('maker defaults', async () => {
    const [takerBtcBefore, takerQuoteBefore] = await Promise.all([
      fetchTokenAmount(takerCvg, baseMintBTC.address),
      fetchTokenAmount(takerCvg, quoteMint.address),
    ]);

    const { vaultAddress } = await takerCvg.vaultOperator().create({
      acceptablePriceLimit: 40000,
      legMint: baseMintBTC,
      quoteMint,
      orderDetails: {
        type: 'buy',
        quoteAmount: 80000,
      },
      activeWindow: 2,
      settlingWindow: 1,
    });

    const { vault, rfq } = await takerCvg
      .vaultOperator()
      .findByAddress({ address: vaultAddress });

    const [response, updatedVault] = await runInParallelWithWait(async () => {
      const { rfqResponse: response } = await makerCvg
        .rfqs()
        .respond({ rfq: rfq.address, ask: { price: 40000 } });
      const { vault: updatedVault } = await executorCvg
        .vaultOperator()
        .confirmAndPrepare({ vault, rfq, response });

      return [response, updatedVault];
    }, 3.5);

    await executorCvg.rfqs().revertSettlementPreparation({
      response: response.address,
      side: 'taker',
    });
    await executorCvg.rfqs().cleanUpResponse({ response: response.address });

    await executorCvg
      .vaultOperator()
      .withdrawTokens({ vault: updatedVault, rfq });

    const [takerBtcAfter, takerQuoteAfter] = await Promise.all([
      fetchTokenAmount(takerCvg, baseMintBTC.address),
      fetchTokenAmount(takerCvg, quoteMint.address),
    ]);
    expect(takerQuoteAfter).toBeCloseTo(takerQuoteBefore);
    expect(takerBtcAfter).toBeCloseTo(takerBtcBefore);
  });

  it('no response', async () => {
    const [takerBtcBefore, takerQuoteBefore] = await Promise.all([
      fetchTokenAmount(takerCvg, baseMintBTC.address),
      fetchTokenAmount(takerCvg, quoteMint.address),
    ]);

    const { vaultAddress } = await takerCvg.vaultOperator().create({
      acceptablePriceLimit: 40000,
      legMint: baseMintBTC,
      quoteMint,
      orderDetails: {
        type: 'buy',
        quoteAmount: 80000,
      },
      activeWindow: 1,
      settlingWindow: 600,
    });

    const { vault, rfq } = await takerCvg
      .vaultOperator()
      .findByAddress({ address: vaultAddress });

    await sleep(1.5);

    await executorCvg.vaultOperator().withdrawTokens({ vault, rfq });

    const [takerBtcAfter, takerQuoteAfter] = await Promise.all([
      fetchTokenAmount(takerCvg, baseMintBTC.address),
      fetchTokenAmount(takerCvg, quoteMint.address),
    ]);
    expect(takerQuoteAfter).toBeCloseTo(takerQuoteBefore);
    expect(takerBtcAfter).toBeCloseTo(takerBtcBefore);
  });
});
