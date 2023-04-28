import { expect } from 'expect';

import { createUserCvg } from '../helpers';
import {
  COLLATERAL_MINT_DECIMALS,
  TAKER_COLLATERAL_INFO_PK,
  TAKER_COLLATERAL_TOKEN_PK,
  TAKER_PK,
} from '../constants';

describe('collateral', () => {
  const cvg = createUserCvg('taker');

  it('find by user', async () => {
    const collateral = await cvg.collateral().findByUser({ user: TAKER_PK });
    expect(collateral.user).toEqual(TAKER_PK);
  });

  it('find by address', async () => {
    const collateralUser = await cvg
      .collateral()
      .findByUser({ user: TAKER_PK });
    const collateral = await cvg
      .collateral()
      .findByAddress({ address: TAKER_COLLATERAL_INFO_PK });
    expect(collateral.user).toEqual(TAKER_PK);
    expect(collateralUser.user).toEqual(collateral.user);
  });

  it('fund', async () => {
    const amount = 100;
    const tokenBefore = await cvg
      .tokens()
      .findTokenByAddress({ address: TAKER_COLLATERAL_TOKEN_PK });

    await cvg.collateral().fund({
      amount,
    });

    const tokenAfter = await cvg
      .tokens()
      .findTokenByAddress({ address: TAKER_COLLATERAL_TOKEN_PK });

    // TODO: For some reason tokenAfter.amount.currency.decimals is not correct
    expect(tokenAfter.amount.basisPoints.toNumber()).toEqual(
      tokenBefore.amount.basisPoints.toNumber() +
        amount * Math.pow(10, COLLATERAL_MINT_DECIMALS)
    );
  });
});
