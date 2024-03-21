import { Mint } from '../../src';
import { createUserCvg } from '../helpers';
import { BASE_MINT_BTC_PK, QUOTE_MINT_PK } from '../constants';

describe('integration.vaultOperator', () => {
  const takerCvg = createUserCvg('taker');
  const makerCvg = createUserCvg('maker');

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
    await takerCvg.vaultOperator().create({
      acceptablePriceLimit: 50000,
      legMint: baseMintBTC,
      quoteMint,
      orderDetails: {
        type: 'sell',
        legAmount: 2,
      },
      activeWindow: 600,
      settlingWindow: 600,
    });

    // const baseAmount = 1.536_421;
    // const quoteAmount = 22_000.86;
    // const feeAmount = quoteAmount * 0.01; // 1% is specified in fixtures

    // const { rfq } = await createRfq(takerCvg, baseAmount, 'sell');
    // expect(rfq).toHaveProperty('address');

    // const { rfqResponse } = await respondToRfq(makerCvg, rfq, quoteAmount);
    // expect(rfqResponse).toHaveProperty('address');

    // const confirmResponse = await takerCvg.rfqs().confirmResponse({
    //   taker: takerCvg.identity(),
    //   rfq: rfq.address,
    //   response: rfqResponse.address,
    //   side: 'bid',
    // });

    // expect(confirmResponse.response).toHaveProperty('signature');

    // const [takerBtcBefore, takerQuoteBefore] = await Promise.all([
    //   fetchTokenAmount(takerCvg, baseMintBTC.address),
    //   fetchTokenAmount(takerCvg, quoteMint.address),
    // ]);

    // const takerResult = await prepareRfqSettlement(takerCvg, rfq, rfqResponse);
    // expect(takerResult.response).toHaveProperty('signature');

    // const makerResult = await prepareRfqSettlement(makerCvg, rfq, rfqResponse);
    // expect(makerResult.response).toHaveProperty('signature');

    // const settleResult = await settleRfq(takerCvg, rfq, rfqResponse);
    // expect(settleResult.response).toHaveProperty('signature');

    // const [takerBtcAfter, takerQuoteAfter] = await Promise.all([
    //   fetchTokenAmount(takerCvg, baseMintBTC.address),
    //   fetchTokenAmount(takerCvg, quoteMint.address),
    // ]);

    // // TODO: This does not seem right in terms of handling precision
    // expect(takerQuoteAfter).toBeCloseTo(
    //   takerQuoteBefore + quoteAmount - feeAmount
    // );
    // expect(takerBtcAfter).toBeCloseTo(takerBtcBefore - baseAmount);
  });

  it('buy', async () => {
    await takerCvg.vaultOperator().create({
      acceptablePriceLimit: 40000,
      legMint: baseMintBTC,
      quoteMint,
      orderDetails: {
        type: 'buy',
        quoteAmount: 80000,
      },
      activeWindow: 600,
      settlingWindow: 600,
    });
  });
});
