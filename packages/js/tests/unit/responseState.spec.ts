import { expect } from 'expect';
import { Response } from '../../src/plugins/rfqModule/models/Response';
import {
  Mint,
  SpotLegInstrument,
  SpotQuoteInstrument,
  FixedSize,
} from '../../src';
import { createUserCvg, sleep } from '../helpers';
import { BASE_MINT_BTC_PK, QUOTE_MINT_PK } from '../constants';

describe('unit.getResponseState', () => {
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

  it('[Kill, Reclaim, Cleanup, Cancelled]', async () => {
    let refreshedResponse: Response;
    const fixedSize: FixedSize = {
      type: 'fixed-base',
      amount: 19.653_038_331,
    };
    const { rfq } = await takerCvg.rfqs().createAndFinalize({
      instruments: [
        await SpotLegInstrument.create(takerCvg, baseMintBTC, 5.12, 'long'),
      ],
      orderType: 'sell',
      quoteAsset: await SpotQuoteInstrument.create(takerCvg, quoteMint),
      fixedSize,
    });
    const { rfqResponse } = await makerCvg.rfqs().respond({
      rfq: rfq.address,
      bid: {
        price: 12000,
      },
    });

    //Kill for maker
    expect(
      takerCvg.rfqs().getResponseState({
        response: rfqResponse,
        rfq,
        caller: 'maker',
        responseSide: 'bid',
      }).responseState
    ).toBe('Kill');

    await makerCvg.rfqs().cancelResponse({ response: rfqResponse.address });
    refreshedResponse = await makerCvg.rfqs().findResponseByAddress({
      address: rfqResponse.address,
    });

    //Cancelled for taker
    expect(
      takerCvg.rfqs().getResponseState({
        response: refreshedResponse,
        rfq,
        caller: 'taker',
        responseSide: 'bid',
      }).responseState
    ).toBe('Cancelled');

    //Unlock Response Collateral
    refreshedResponse = await makerCvg.rfqs().findResponseByAddress({
      address: rfqResponse.address,
    });
    expect(
      takerCvg.rfqs().getResponseState({
        response: refreshedResponse,
        rfq,
        caller: 'maker',
        responseSide: 'bid',
      }).responseState
    ).toBe('Reclaim');
    await makerCvg.rfqs().unlockResponseCollateral({
      response: refreshedResponse.address,
    });

    //Cleanup for maker
    refreshedResponse = await makerCvg.rfqs().findResponseByAddress({
      address: rfqResponse.address,
    });
    expect(
      takerCvg.rfqs().getResponseState({
        response: refreshedResponse,
        rfq,
        caller: 'maker',
        responseSide: 'bid',
      }).responseState
    ).toBe('Cleanup');

    await makerCvg.rfqs().cleanUpResponse({
      response: rfqResponse.address,
      maker: makerCvg.identity().publicKey,
    });
  });

  it('[Approve, Settle, Settled]', async () => {
    let refreshedResponse: Response;
    const fixedSize: FixedSize = {
      type: 'fixed-base',
      amount: 19.653_038_331,
    };
    const { rfq } = await takerCvg.rfqs().createAndFinalize({
      instruments: [
        await SpotLegInstrument.create(takerCvg, baseMintBTC, 5.12, 'long'),
      ],
      orderType: 'sell',
      quoteAsset: await SpotQuoteInstrument.create(takerCvg, quoteMint),
      fixedSize,
    });
    const { rfqResponse } = await makerCvg.rfqs().respond({
      rfq: rfq.address,
      bid: {
        price: 12000,
      },
    });

    //Approve
    expect(
      takerCvg.rfqs().getResponseState({
        response: rfqResponse,
        rfq,
        caller: 'taker',
        responseSide: 'bid',
      }).responseState
    ).toBe('Approve');

    await takerCvg.rfqs().confirmResponse({
      response: rfqResponse.address,
      side: 'bid',
      rfq: rfq.address,
    });

    //Settle for maker
    refreshedResponse = await makerCvg.rfqs().findResponseByAddress({
      address: rfqResponse.address,
    });
    expect(
      takerCvg.rfqs().getResponseState({
        response: refreshedResponse,
        rfq,
        caller: 'maker',
        responseSide: 'bid',
      }).responseState
    ).toBe('Settle');

    //Settle for taker
    expect(
      takerCvg.rfqs().getResponseState({
        response: refreshedResponse,
        rfq,
        caller: 'taker',
        responseSide: 'bid',
      }).responseState
    ).toBe('Settle');

    await takerCvg.rfqs().prepareSettlement({
      response: rfqResponse.address,
      rfq: rfq.address,
      legAmountToPrepare: rfq.legs.length,
    });

    await makerCvg.rfqs().prepareSettlement({
      response: rfqResponse.address,
      rfq: rfq.address,
      legAmountToPrepare: rfq.legs.length,
    });

    await takerCvg.rfqs().settle({
      response: rfqResponse.address,
      rfq: rfq.address,
      maker: makerCvg.identity().publicKey,
      taker: takerCvg.identity().publicKey,
    });

    //Settled
    refreshedResponse = await makerCvg.rfqs().findResponseByAddress({
      address: rfqResponse.address,
    });
    expect(
      takerCvg.rfqs().getResponseState({
        response: refreshedResponse,
        rfq,
        caller: 'maker',
        responseSide: 'bid',
      }).responseState
    ).toBe('Settled');
  });

  it('[Expired]', async () => {
    const fixedSize: FixedSize = {
      type: 'fixed-base',
      amount: 19.653_038_331,
    };
    const { rfq } = await takerCvg.rfqs().createAndFinalize({
      instruments: [
        await SpotLegInstrument.create(takerCvg, baseMintBTC, 5.12, 'long'),
      ],
      orderType: 'sell',
      quoteAsset: await SpotQuoteInstrument.create(takerCvg, quoteMint),
      fixedSize,
      activeWindow: 2,
      settlingWindow: 1,
    });
    const { rfqResponse } = await makerCvg.rfqs().respond({
      rfq: rfq.address,
      bid: {
        price: 12000,
      },
    });
    await sleep(3);
    //Expired
    expect(
      takerCvg.rfqs().getResponseState({
        response: rfqResponse,
        rfq,
        caller: 'taker',
        responseSide: 'bid',
      }).responseState
    ).toBe('Expired');
  });

  it('[Rejected, Defaulted]', async () => {
    const fixedSize: FixedSize = {
      type: 'fixed-base',
      amount: 19.653_038_331,
    };
    const { rfq } = await takerCvg.rfqs().createAndFinalize({
      instruments: [
        await SpotLegInstrument.create(takerCvg, baseMintBTC, 5.12, 'long'),
      ],
      orderType: 'two-way',
      quoteAsset: await SpotQuoteInstrument.create(takerCvg, quoteMint),
      fixedSize,
    });
    const { rfqResponse } = await makerCvg.rfqs().respond({
      rfq: rfq.address,
      bid: {
        price: 12000,
      },
      ask: {
        price: 21000,
      },
    });

    await takerCvg.rfqs().confirmResponse({
      response: rfqResponse.address,
      side: 'bid',
      rfq: rfq.address,
    });

    const refreshedResponse = await makerCvg.rfqs().findResponseByAddress({
      address: rfqResponse.address,
    });
    //Approve
    expect(
      takerCvg.rfqs().getResponseState({
        response: refreshedResponse,
        rfq,
        caller: 'taker',
        responseSide: 'bid',
      }).responseState
    ).toBe('Settle');

    //Rejected
    expect(
      takerCvg.rfqs().getResponseState({
        response: refreshedResponse,
        rfq,
        caller: 'taker',
        responseSide: 'ask',
      }).responseState
    ).toBe('Rejected');
  });
});
