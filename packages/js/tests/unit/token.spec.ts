import { expect } from 'expect';
import { PublicKey } from '@solana/web3.js';

import { createUserCvg, generatePk } from '../helpers';
import { CTX, BASE_MINT_DECIMALS, BASE_MINT_BTC_PK } from '../constants';
import { token } from '../../src';

describe('unit.token', () => {
  const cvg = createUserCvg('dao');

  it('create mint', async () => {
    const { mint } = await cvg
      .tokens()
      .createMint({ decimals: BASE_MINT_DECIMALS });
    expect(mint.mintAuthorityAddress).toEqual(cvg.identity().publicKey);
    expect(mint.decimals).toEqual(BASE_MINT_DECIMALS);
  });

  it('find mint', async () => {
    const mint = await cvg
      .tokens()
      .findMintByAddress({ address: BASE_MINT_BTC_PK });
    expect(mint.address.toBase58()).toEqual(CTX.baseMintBTC);
    expect(mint.decimals.toString()).toEqual(BASE_MINT_DECIMALS.toString());
  });

  it('mint', async () => {
    const { response } = await cvg.tokens().mint({
      mintAddress: BASE_MINT_BTC_PK,
      amount: token(100),
      toToken: new PublicKey(CTX.takerBaseWallet),
    });
    expect(response).toHaveProperty('signature');
  });

  it('create token', async () => {
    const mint = await cvg
      .tokens()
      .findMintByAddress({ address: BASE_MINT_BTC_PK });
    const owner = await generatePk();
    const { token } = await cvg
      .tokens()
      .createToken({ mint: mint.address, owner });
    expect(token.ownerAddress).toEqual(owner);
  });

  it('get token', async () => {
    const token = await cvg.tokens().findTokenByAddress({
      address: new PublicKey(CTX.makerBaseWallet),
    });
    expect(token.address.toBase58()).toEqual(CTX.makerBaseWallet);
    expect(token.ownerAddress.toBase58()).toEqual(CTX.maker);
  });
});
