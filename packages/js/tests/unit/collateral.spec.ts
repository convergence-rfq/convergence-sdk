import { expect } from 'expect';

import { createUserCvg } from '../helpers';
import {
  TAKER_COLLATERAL_INFO_PK,
  TAKER_COLLATERAL_TOKEN_PK,
  TAKER_PK,
  TAKER_QUOTE_WALLET_PK,
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
    const { lockedTokensAmount } = await cvg
      .collateral()
      .findByUser({ user: TAKER_PK });
    await cvg.collateral().fund({
      amount,
      collateralInfo: TAKER_COLLATERAL_INFO_PK,
      collateralToken: TAKER_COLLATERAL_TOKEN_PK,
      userTokens: TAKER_QUOTE_WALLET_PK,
    });
    const collateral = await cvg.collateral().findByUser({ user: TAKER_PK });
    expect(collateral.lockedTokensAmount).toEqual(lockedTokensAmount + amount);
  });
});
