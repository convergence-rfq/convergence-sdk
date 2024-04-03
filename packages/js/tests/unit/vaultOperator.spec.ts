import { expect } from 'expect';
import { EscrowRfq, Mint, VaultParameters } from '../../src';
import { createUserCvg } from '../helpers';
import { BASE_MINT_BTC_PK, QUOTE_MINT_PK } from '../constants';

describe('unit.vaultOperator', () => {
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

  it('can fetch single vault operator info and parameters match', async () => {
    const { vaultAddress } = await takerCvg.vaultOperator().create({
      acceptablePriceLimit: 40000,
      legMint: baseMintBTC,
      quoteMint,
      orderDetails: {
        type: 'buy',
        quoteAmount: 80000,
      },
      activeWindow: 600,
      settlingWindow: 1200,
    });

    const { vault, rfq }: { vault: VaultParameters; rfq: EscrowRfq } =
      await takerCvg.vaultOperator().findByAddress({ address: vaultAddress });

    expect(vault.acceptablePriceLimit).toEqual(40000);
    expect(rfq.legs[0].getAssetMint()).toEqual(baseMintBTC.address);
    expect(rfq.quoteMint).toEqual(quoteMint.address);
    expect(rfq.orderType).toEqual('buy');
    expect(rfq.size).toEqual({
      type: 'fixed-quote',
      amount: 80000,
    });
    expect(rfq.activeWindow).toEqual(600);
    expect(rfq.settlingWindow).toEqual(1200);
  });

  it('can fetch multiple vaults', async () => {
    const expectedAddresses = [];
    for (let i = 0; i < 3; i++) {
      const { vaultAddress, rfqAddress } = await takerCvg
        .vaultOperator()
        .create({
          acceptablePriceLimit: 40000,
          legMint: baseMintBTC,
          quoteMint,
          orderDetails: {
            type: 'buy',
            quoteAmount: 80000,
          },
          activeWindow: 600,
          settlingWindow: 1200,
        });
      expectedAddresses.push({ vaultAddress, rfqAddress });
    }

    const sdkVaults = await takerCvg
      .vaultOperator()
      .find({ creator: takerCvg.identity().publicKey });
    const sdkAddresses = sdkVaults.map((r) => ({
      vaultAddress: r.vault.address,
      rfqAddress: r.rfq.address,
    }));

    for (const expected of expectedAddresses) {
      const found = sdkAddresses.find(
        (x) =>
          x.vaultAddress.equals(expected.vaultAddress) &&
          x.rfqAddress.equals(expected.rfqAddress)
      );
      expect(found).not.toBeUndefined();
    }
  });
});
